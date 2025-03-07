/**
 * The code is originally derived from https://github.com/XRPL-Labs/tangem-sdk-react-native
 * but being completely rewritten. And below is the original license:
 *
 * MIT License
 *
 * Copyright (c) 2021 XRPL Labs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

package com.megnat

import android.app.Activity
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.megnat.tangem.ResetToFactorySettingsTask
import com.tangem.Message
import com.tangem.TangemSdk
import com.tangem.common.CompletionResult
import com.tangem.common.UserCodeType
import com.tangem.common.card.EllipticCurve
import com.tangem.common.core.Config
import com.tangem.common.core.TangemSdkError
import com.tangem.common.core.UserCodeRequestPolicy
import com.tangem.common.extensions.hexToBytes
import com.tangem.common.json.MoshiJsonConverter
import com.tangem.common.services.secure.SecureStorage
import com.tangem.crypto.bip39.DefaultMnemonic
import com.tangem.crypto.bip39.Wordlist
import com.tangem.crypto.hdWallet.DerivationPath
import com.tangem.crypto.hdWallet.bip32.ExtendedPrivateKey
import com.tangem.crypto.hdWallet.masterkey.AnyMasterKeyFactory
import com.tangem.operations.attestation.AttestationTask
import com.tangem.operations.derivation.DeriveWalletPublicKeyTask
import com.tangem.operations.wallet.CreateWalletTask
import com.tangem.sdk.DefaultSessionViewDelegate
import com.tangem.sdk.extensions.getWordlist
import com.tangem.sdk.extensions.initAuthenticationManager
import com.tangem.sdk.extensions.initKeystoreManager
import com.tangem.sdk.extensions.initNfcManager
import com.tangem.sdk.extensions.localizedDescription
import com.tangem.sdk.nfc.AndroidNfcAvailabilityProvider
import com.tangem.sdk.nfc.NfcManager
import com.tangem.sdk.storage.create
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.lang.ref.WeakReference

class TangemModule(val reactContext: ReactApplicationContext): ReactContextBaseJavaModule(reactContext),
    LifecycleEventListener {
    private var nfcManager = WeakReference<NfcManager?>(null)
    private var sdk = WeakReference<TangemSdk?>(null)

    private val handler = Handler(Looper.getMainLooper())
    private val converter = MoshiJsonConverter.INSTANCE

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName() = "TangemModule"

    private fun getNfcManager(): NfcManager? {
        nfcManager.get()?.let {
            nfcManager -> return nfcManager
        }

        val activity = currentActivity ?: return null

        val nfcManager = TangemSdk.initNfcManager(activity as FragmentActivity)

        this.nfcManager = WeakReference(nfcManager)

        return nfcManager
    }

    private fun getSdk(): TangemSdk? {
        sdk.get()?.let { sdk -> return sdk }

        val nfcManager = getNfcManager() ?: return null

        val activity = currentActivity ?: return null

        val authenticationManager =
            TangemSdk.initAuthenticationManager(activity as FragmentActivity)

        val secureStorage = SecureStorage.create(reactContext)

        val keystoreManager =
            TangemSdk.initKeystoreManager(authenticationManager, secureStorage)

        val viewDelegate = DefaultSessionViewDelegate(nfcManager, activity)

        val config = Config()

        config.userCodeRequestPolicy = UserCodeRequestPolicy.AlwaysWithBiometrics(UserCodeType.AccessCode)
        config.defaultDerivationPaths = mutableMapOf<EllipticCurve, List<DerivationPath>>().apply {
            this[EllipticCurve.Secp256k1] = listOf(DerivationPath("m/44'/60'/0'/0/0"))
        }

        val sdk = TangemSdk(
            reader = nfcManager.reader,
            viewDelegate = viewDelegate,
            nfcAvailabilityProvider = AndroidNfcAvailabilityProvider(activity),
            secureStorage = secureStorage,
            wordlist = Wordlist.getWordlist(activity),
            authenticationManager = authenticationManager,
            keystoreManager = keystoreManager,
            config = config,
        )

        this.sdk = WeakReference(sdk)

        return sdk
    }

    private fun requireSdk(): TangemSdk {
        return getSdk() ?: throw Exception("SDK is not initialized")
    }

    override fun onHostResume() {
        val activity = currentActivity ?: return

        if (activity.isDestroyed || activity.isFinishing) {
            return
        }

        nfcManager.get()?.onStart(activity as AppCompatActivity)
    }

    override fun onHostPause() {
        val activity = currentActivity ?: return

        if (activity.isDestroyed || activity.isFinishing) {
            return
        }

        nfcManager.get()?.onStop(activity as AppCompatActivity)
    }

    override fun onHostDestroy() {
        val activity = currentActivity ?: return

        if (activity.isDestroyed || activity.isFinishing) {
            return
        }

        nfcManager.get()?.onStop(activity as AppCompatActivity)
    }

    @ReactMethod
    fun scan(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                requireSdk().scanCard { handleResult(it, promise) }
            } catch (ex: Exception) {
                handleException(ex, promise)
            }
        }
    }

    @ReactMethod
    fun createWallet(optionMap: ReadableMap, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val options = OptionsParser(optionMap)

                val sdk = requireSdk()

                val extendedPrivateKey = options.getPrivateKey()?.let {
                    ExtendedPrivateKey(
                        it,
                        chainCode = ByteArray(32)
                    )
                } ?: options.getMnemonic()?.let {
                    val defaultMnemonic = DefaultMnemonic(it, sdk.wordlist)
                    val factory = AnyMasterKeyFactory(defaultMnemonic, "")
                    factory.makeMasterKey(options.getCurveOrDefault())
                }

                val runnable = CreateWalletTask(
                    options.getCurveOrDefault(),
                    extendedPrivateKey
                )

                sdk.startSessionWithRunnable(
                    runnable,
                ) { handleResult(it, promise) }
            } catch (ex: Exception) {
                handleException(ex, promise)
            }
        }
    }

    @ReactMethod
    fun deriveWallet(optionMap: ReadableMap, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val options = OptionsParser(optionMap)

                val runnable = DeriveWalletPublicKeyTask(
                    options.requireWalletPublicKey(),
                    options.requireDerivationPath()
                )

                requireSdk().startSessionWithRunnable(
                    runnable,
                ) { handleResult(it, promise) }
            } catch (ex: Exception) {
                handleException(ex, promise)
            }
        }
    }

    @ReactMethod
    fun setAccessCode(optionMap: ReadableMap, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val options = OptionsParser(optionMap)

                requireSdk().setAccessCode(
                    options.getAccessCode(),
                    options.requireCardId(),
                ) { handleResult(it, promise) }
            } catch (ex: Exception) {
                handleException(ex, promise)
            }
        }
    }

    @ReactMethod
    fun purgeWallet(optionMap: ReadableMap, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val options = OptionsParser(optionMap)

                requireSdk().purgeWallet(
                    options.requireWalletPublicKey(),
                    options.requireCardId(),
                ) { handleResult(it, promise) }
            } catch (ex: Exception) {
                handleException(ex, promise)
            }
        }
    }

    @ReactMethod
    fun purgeAllWallets(optionMap: ReadableMap, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val options = OptionsParser(optionMap)

                val runnable = ResetToFactorySettingsTask(
                    toResetBackup = false,
                    allowsRequestAccessCodeFromRepository = false
                )

                requireSdk().startSessionWithRunnable(
                    runnable,
                    cardId = options.requireCardId()
                ) { handleResult(it, promise) }
            } catch (ex: Exception) {
                handleException(ex, promise)
            }
        }
    }

    @ReactMethod
    fun sign(optionMap: ReadableMap, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val options = OptionsParser(optionMap)

                requireSdk().sign(
                    options.getHashes(),
                    options.requireWalletPublicKey(),
                    options.getCardId(),
                    options.getDerivationPath()
                ) { handleResult(it, promise) }
            } catch (ex: Exception) {
                handleException(ex, promise)
            }
        }
    }

    @Throws(JSONException::class)
    fun toWritableMap(jsonObject: JSONObject): WritableMap {
        val writableMap = Arguments.createMap()
        val iterator = jsonObject.keys()
        while (iterator.hasNext()) {
            val key = iterator.next() as String
            val value = jsonObject.get(key)
            if (value is Float || value is Double) {
                writableMap.putDouble(key, jsonObject.getDouble(key))
            } else if (value is Number) {
                writableMap.putInt(key, jsonObject.getInt(key))
            } else if (value is String) {
                writableMap.putString(key, jsonObject.getString(key))
            } else if (value is Boolean) {
                writableMap.putBoolean(key, jsonObject.getBoolean(key))
            } else if (value is JSONObject) {
                writableMap.putMap(key, toWritableMap(jsonObject.getJSONObject(key)))
            } else if (value is JSONArray) {
                writableMap.putArray(key, toWritableMap(jsonObject.getJSONArray(key)))
            } else if (value === JSONObject.NULL) {
                writableMap.putNull(key)
            }
        }

        return writableMap
    }

    @Throws(JSONException::class)
    fun toWritableMap(jsonArray: JSONArray): WritableArray {
        val writableArray = Arguments.createArray()
        for (i in 0 until jsonArray.length()) {
            val value = jsonArray.get(i)
            if (value is Float || value is Double) {
                writableArray.pushDouble(jsonArray.getDouble(i))
            } else if (value is Number) {
                writableArray.pushInt(jsonArray.getInt(i))
            } else if (value is String) {
                writableArray.pushString(jsonArray.getString(i))
            } else if (value is Boolean) {
                writableArray.pushBoolean(jsonArray.getBoolean(i))
            } else if (value is JSONObject) {
                writableArray.pushMap(toWritableMap(jsonArray.getJSONObject(i)))
            } else if (value is JSONArray) {
                writableArray.pushArray(toWritableMap(jsonArray.getJSONArray(i)))
            } else if (value === JSONObject.NULL) {
                writableArray.pushNull()
            }
        }
        return writableArray
    }

    private fun normalizeResponse(resp: Any?): WritableMap {
        val jsonObject = when (resp) {
            is Boolean, is Double, is Int, is String -> JSONObject().apply {
                put("value", resp)
            }
            else -> JSONObject(converter.toJson(resp))
        }
        return toWritableMap(jsonObject)
    }


    private fun handleResult(completionResult: CompletionResult<*>, promise: Promise) {
        when (completionResult) {
            is CompletionResult.Success -> {
                handler.post { promise.resolve(normalizeResponse(completionResult.data)) }
            }

            is CompletionResult.Failure -> {
                val error = completionResult.error
                val errorMessage = if (error is TangemSdkError) {
                    if (currentActivity == null) {
                        error.customMessage
                    } else error.localizedDescription(
                        currentActivity as Activity
                    )
                } else {
                    error.customMessage
                }

                handler.post {
                    promise.reject("${error.code}", errorMessage, null)
                }
            }
        }
    }

    private fun handleException(ex: Exception, promise: Promise) {
        handler.post {
            val code = 9999
            val localizedDescription: String = ex.toString()
            promise.reject("$code", localizedDescription, null)
        }
    }

}


class RequiredArgumentException(arg: String) : Exception(arg)


class OptionsParser(private val options: ReadableMap?) {
    fun getInitialMessage(): Message? {
        if (!options?.hasKey("initialMessage")!!) return null

        if (options.getMap("initialMessage") !is ReadableMap) {
            return null
        }

        val message = options.getMap("initialMessage") as ReadableMap

        val header = if (message.hasKey("header")) message.getString("header") else ""
        val body = if (message.hasKey("body")) message.getString("body") else ""

        return Message(
            header,
            body
        )
    }

    fun requireWalletPublicKey(): ByteArray {
        return options?.getString("walletPublicKey")?.hexToBytes() ?:
            throw RequiredArgumentException("walletPublicKey is required")
    }

    fun getCardId(): String? {
        return options?.getString("cardId")
    }

    fun requireCardId(): String {
        return getCardId() ?: throw RequiredArgumentException("cardId is required")
    }

    fun getAccessCode(): String? {
        val accessCode = options?.getString("accessCode")
        if (accessCode.isNullOrEmpty()) {
            return null
        }
        return accessCode
    }

    fun getPasscode(): String? {
        val passcode = options?.getString("passcode")
        if (passcode.isNullOrEmpty()) {
            return null
        }
        return passcode
    }

    fun getCurveOrDefault(): EllipticCurve {
        return when (options?.getString("curve")) {
            "ed25519" -> EllipticCurve.Ed25519
            "secp256k1" -> EllipticCurve.Secp256k1
            "secp256r1" -> EllipticCurve.Secp256r1
            else -> {
                EllipticCurve.Secp256k1
            }
        }
    }

    fun getPrivateKey(): ByteArray? {
        return options?.getString("privateKey")?.hexToBytes()
    }

    fun getMnemonic(): String? {
        return options?.getString("mnemonic")
    }

    fun getHashes(): Array<ByteArray> {
        val hashes = options?.getArray("hashes")
        if (hashes == null || hashes.size() == 0) {
            throw RequiredArgumentException("hashes is required")
        }
        return hashes.toArrayList().map { it.toString().hexToBytes() }.toTypedArray()
    }

    fun getDerivationPath(): DerivationPath? {
        return options?.getString("derivationPath")?.let {
            DerivationPath(it)
        }
    }

    fun requireDerivationPath(): DerivationPath {
        return getDerivationPath() ?: throw RequiredArgumentException("derivationPath is required")
    }

    fun getAttestationMode(): AttestationTask.Mode? {
        return when (options?.getString("attestationMode")) {
            "offline" -> AttestationTask.Mode.Offline
            "normal" -> AttestationTask.Mode.Normal
            "full" -> AttestationTask.Mode.Full
            else -> {
                null
            }
        }
    }
}
