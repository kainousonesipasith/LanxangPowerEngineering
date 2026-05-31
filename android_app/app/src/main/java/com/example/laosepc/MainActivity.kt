package com.example.laosepc

import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { context ->
                    WebView(context).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.allowFileAccess = true
                        settings.allowContentAccess = true
                        
                        // Critical properties to allow file:// scripts to query network endpoints
                        settings.allowFileAccessFromFileURLs = true
                        settings.allowUniversalAccessFromFileURLs = true
                        
                        webViewClient = WebViewClient()
                        
                        // Log JavaScript console.log/error messages to Android Logcat
                        webChromeClient = object : WebChromeClient() {
                            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                                consoleMessage?.let {
                                    val logMsg = "[${it.messageLevel()}] ${it.message()} -- From ${it.sourceId()}:${it.lineNumber()}"
                                    when (it.messageLevel()) {
                                        ConsoleMessage.MessageLevel.ERROR -> Log.e("WebViewConsole", logMsg)
                                        ConsoleMessage.MessageLevel.WARNING -> Log.w("WebViewConsole", logMsg)
                                        else -> Log.d("WebViewConsole", logMsg)
                                    }
                                }
                                return super.onConsoleMessage(consoleMessage)
                            }
                        }
                        
                        loadUrl("file:///android_asset/index.html")
                    }
                }
            )
        }
    }
}
