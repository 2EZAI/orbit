import Foundation
import Security
import React

// Service to store and retrieve auth tokens from Keychain
// This can be called from React Native to store tokens for Siri integration

@objc(OrbitAuthService)
class OrbitAuthService: NSObject, RCTBridgeModule {
    
    static func moduleName() -> String! {
        return "OrbitAuthService"
    }
    
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    private static let serviceName = "com.dovydmcnugget.orbit"
    private static let tokenKey = "auth_token"
    
    @objc
    static func storeToken(_ token: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let data = token.data(using: .utf8)!
        
        // Delete existing item if it exists
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: tokenKey
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // Add new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked
        ]
        
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        if status == errSecSuccess {
            resolve(true)
        } else {
            reject("STORE_ERROR", "Failed to store token", NSError(domain: "OrbitAuthService", code: Int(status)))
        }
    }
    
    @objc
    static func getToken(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            resolve(nil)
            return
        }
        
        resolve(token)
    }
    
    @objc
    static func deleteToken(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: tokenKey
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound {
            resolve(true)
        } else {
            reject("DELETE_ERROR", "Failed to delete token", NSError(domain: "OrbitAuthService", code: Int(status)))
        }
    }
    
    // Internal method used by App Intents (not exposed to React Native)
    static func getTokenForAppIntent() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return token
    }
}

