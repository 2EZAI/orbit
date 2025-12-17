import Foundation
import AppIntents

// MARK: - Create Event Intent
@available(iOS 17.0, *)
struct CreateEventIntent: AppIntent {
    static var title: LocalizedStringResource = "Create Event in Orbit"
    static var description = IntentDescription("Create a new event in Orbit social app")
    static var openAppWhenRun: Bool = true
    static var authenticationPolicy: IntentAuthenticationPolicy = .required
    
    @Parameter(title: "Event Name")
    var eventName: String
    
    @Parameter(title: "Description")
    var description: String
    
    @Parameter(title: "Location")
    var location: String?
    
    @Parameter(title: "Date")
    var date: Date?
    
    static var parameterSummary: some ParameterSummary {
        Summary("Create event \(\.$eventName)") {
            \.$description
            \.$location
            \.$date
        }
    }
    
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        // Get user's authentication token from Keychain
        guard let token = getAuthToken() else {
            throw IntentError.authenticationRequired
        }
        
        // Use web backend URL (matches latest codebase)
        let backendURL = "https://orbit-web-backend.onrender.com"
        
        // Prepare event data matching latest create event format
        var eventData: [String: Any] = [
            "name": eventName,
            "description": description,
            "type": "Default",
            "is_private": false
        ]
        
        // Add location details if provided
        if let location = location {
            eventData["address"] = location
            // Try to parse city/state from location string if possible
            // For now, just set address and let backend handle geocoding
        }
        
        // Add date/time if provided
        if let date = date {
            eventData["start_datetime"] = ISO8601DateFormatter().string(from: date)
            // Set end_datetime to 2 hours after start if not specified
            let endDate = date.addingTimeInterval(2 * 60 * 60) // 2 hours
            eventData["end_datetime"] = ISO8601DateFormatter().string(from: endDate)
        } else {
            // Default to current time if no date provided
            let now = Date()
            eventData["start_datetime"] = ISO8601DateFormatter().string(from: now)
            let endDate = now.addingTimeInterval(2 * 60 * 60) // 2 hours
            eventData["end_datetime"] = ISO8601DateFormatter().string(from: endDate)
        }
        
        // Create event via API (using latest endpoint format)
        let url = URL(string: "\(backendURL)/api/events")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: eventData)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw IntentError.apiError("Invalid response from server")
            }
            
            if (200...299).contains(httpResponse.statusCode) {
                // Try to parse response to get event details
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let eventName = json["name"] as? String {
                    let message = "Event '\(eventName)' created successfully!"
                    return .result(value: message)
                } else {
                    let message = "Event '\(eventName)' created successfully!"
                    return .result(value: message)
                }
            } else {
                // Try to get error message from response
                let errorMessage: String
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let error = json["error"] as? String ?? json["message"] as? String {
                    errorMessage = error
                } else {
                    errorMessage = "Failed to create event (HTTP \(httpResponse.statusCode))"
                }
                throw IntentError.apiError(errorMessage)
            }
            
        } catch let error as IntentError {
            throw error
        } catch {
            throw IntentError.apiError("Error creating event: \(error.localizedDescription)")
        }
    }
    
    private func getAuthToken() -> String? {
        // Use OrbitAuthService to retrieve token from Keychain
        return OrbitAuthService.getTokenForAppIntent()
    }
}

// MARK: - Search Events Intent
@available(iOS 17.0, *)
struct SearchEventsIntent: AppIntent {
    static var title: LocalizedStringResource = "Search Events in Orbit"
    static var description = IntentDescription("Search for events in Orbit near your location")
    static var openAppWhenRun: Bool = true
    
    @Parameter(title: "Search Query")
    var query: String
    
    @Parameter(title: "Location")
    var location: String?
    
    static var parameterSummary: some ParameterSummary {
        Summary("Search for \(\.$query) events") {
            \.$location
        }
    }
    
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        // Use web backend URL (matches latest codebase)
        let backendURL = "https://orbit-web-backend.onrender.com"
        
        // This would typically get user's current location
        // For now, use a default location if none provided
        let latitude = 37.7749  // San Francisco default
        let longitude = -122.4194
        
        let url = URL(string: "\(backendURL)/api/events/user-location")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "latitude": latitude,
            "longitude": longitude,
            "category": query,
            "timeRange": "today"  // Default to today's events
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw IntentError.apiError("Invalid response from server")
            }
            
            if (200...299).contains(httpResponse.statusCode) {
                guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let events = json["events"] as? [[String: Any]] else {
                    throw IntentError.apiError("Failed to parse search results")
                }
                
                let eventNames = events.prefix(5).compactMap { $0["name"] as? String }
                let result = eventNames.isEmpty 
                    ? "No events found for '\(query)'"
                    : "Found \(events.count) events. Here are some: \(eventNames.joined(separator: ", "))"
                
                return .result(value: result)
            } else {
                // Try to get error message from response
                let errorMessage: String
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let error = json["error"] as? String ?? json["message"] as? String {
                    errorMessage = error
                } else {
                    errorMessage = "Failed to search events (HTTP \(httpResponse.statusCode))"
                }
                throw IntentError.apiError(errorMessage)
            }
            
        } catch let error as IntentError {
            throw error
        } catch {
            throw IntentError.apiError("Error searching events: \(error.localizedDescription)")
        }
    }
}

// MARK: - Intent Error
enum IntentError: Error, CustomLocalizedStringResourceConvertible {
    case authenticationRequired
    case apiError(String)
    
    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .authenticationRequired:
            return "Please log in to Orbit app first"
        case .apiError(let message):
            return LocalizedStringResource(stringLiteral: message)
        }
    }
}

