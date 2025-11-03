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
        
        // Get backend URL from Info.plist or hardcode
        let backendURL = "https://orbit-map-backend-c2b17aebdb75.herokuapp.com"
        
        // Prepare event data
        var eventData: [String: Any] = [
            "name": eventName,
            "description": description,
            "type": "Default"
        ]
        
        if let location = location {
            eventData["address"] = location
        }
        
        if let date = date {
            eventData["start_datetime"] = ISO8601DateFormatter().string(from: date)
        }
        
        // Create event via API
        let url = URL(string: "\(backendURL)/api/events/create")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: eventData)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw IntentError.apiError("Failed to create event")
            }
            
            let message = "Event '\(eventName)' created successfully!"
            return .result(value: message)
            
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
        // Get current location or use provided location
        let backendURL = "https://orbit-map-backend-c2b17aebdb75.herokuapp.com"
        
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
            "category": query
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let events = json["events"] as? [[String: Any]] else {
                throw IntentError.apiError("Failed to search events")
            }
            
            let eventNames = events.prefix(5).compactMap { $0["name"] as? String }
            let result = eventNames.isEmpty 
                ? "No events found for '\(query)'"
                : "Found \(events.count) events. Here are some: \(eventNames.joined(separator: ", "))"
            
            return .result(value: result)
            
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

