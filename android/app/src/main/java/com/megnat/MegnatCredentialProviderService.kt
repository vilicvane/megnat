package com.megnat

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.os.CancellationSignal
import android.os.OutcomeReceiver
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.net.toUri
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.provider.BeginCreateCredentialRequest
import androidx.credentials.provider.BeginCreateCredentialResponse
import androidx.credentials.provider.BeginCreatePublicKeyCredentialRequest
import androidx.credentials.provider.BeginGetCredentialRequest
import androidx.credentials.provider.BeginGetCredentialResponse
import androidx.credentials.provider.BeginGetPublicKeyCredentialOption
import androidx.credentials.provider.CreateEntry
import androidx.credentials.provider.CredentialEntry
import androidx.credentials.provider.CredentialProviderService
import androidx.credentials.provider.ProviderClearCredentialStateRequest
import androidx.credentials.provider.PublicKeyCredentialEntry
import androidx.credentials.webauthn.AuthenticatorAttestationResponse

val CREATE_PASSKEY_URI = "megnat://credential-provider/create-passkey".toUri()
val GET_PASSKEY_URI = "megnat://credential-provider/get-passkey".toUri()

@RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
class MegnatCredentialProviderService: CredentialProviderService() {
  override fun onBeginCreateCredentialRequest(
    request: BeginCreateCredentialRequest,
    cancellationSignal: CancellationSignal,
    callback: OutcomeReceiver<BeginCreateCredentialResponse, CreateCredentialException>
  ) {
    if (request !is BeginCreatePublicKeyCredentialRequest) {
      callback.onResult(BeginCreateCredentialResponse())
      return
    }

    Log.d("MegnatCredentialProviderService", request.toString())
    Log.d("MegnatCredentialProviderService", request.requestJson)

    val uri = CREATE_PASSKEY_URI.buildUpon().apply {
      appendQueryParameter("request", request.requestJson)
    }.build()

    val intent = Intent(this, CredentialProviderActivity::class.java).apply {
      setAction(Intent.ACTION_VIEW)
      setData(uri)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
    )

    callback.onResult(BeginCreateCredentialResponse(listOf(
      CreateEntry("Megnat Passkey", pendingIntent)
    )))
  }

  override fun onBeginGetCredentialRequest(
    request: BeginGetCredentialRequest,
    cancellationSignal: CancellationSignal,
    callback: OutcomeReceiver<BeginGetCredentialResponse, GetCredentialException>
  ) {
    Log.d("MegnatCredentialProviderService", request.toString())

    val option = request.beginGetCredentialOptions.find {
      it is BeginGetPublicKeyCredentialOption
    } as? BeginGetPublicKeyCredentialOption

    if (option == null) {
      callback.onResult(BeginGetCredentialResponse())
      return
    }

    Log.d("MegnatCredentialProviderService", option.toString())
    Log.d("MegnatCredentialProviderService", option.requestJson)

    val uri = GET_PASSKEY_URI.buildUpon().apply {
      appendQueryParameter("request", option.requestJson)
    }.build()

    val intent = Intent(this, CredentialProviderActivity::class.java).apply {
      setAction(Intent.ACTION_VIEW)
      setData(uri)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
    )

    callback.onResult(BeginGetCredentialResponse(listOf(
      PublicKeyCredentialEntry(this, "Megnat Passkey", pendingIntent, option)
    )))
  }

  override fun onClearCredentialStateRequest(
    request: ProviderClearCredentialStateRequest,
    cancellationSignal: CancellationSignal,
    callback: OutcomeReceiver<Void?, ClearCredentialException>
  ) {
    callback.onResult(null)
  }
}
