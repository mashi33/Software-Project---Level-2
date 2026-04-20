<<<<<<< HEAD
# SmartJourneyUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.9.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
=======
# Smart Journey Planner

> **A comprehensive travel management system for Sri Lanka that integrates trip planning, budgeting, and real-time weather tracking.**

![Project Status](https://img.shields.io/badge/Status-Development-green)
![Tech Stack](https://img.shields.io/badge/Stack-Angular_%7C_.NET_%7C_MongoDB-blue)

## 📖 About The Project

**Smart Journey Planner** is a software solution designed to streamline the travel experience. It allows users to manage trip details, calculate budgets, plan routes using Google Maps, and receive weather-based advice for their journeys. The system is built to handle complex group travel logistics including role assignments and collaborative timelines.

## 🚀 Key Features by Module

* [cite_start]**Trip Management & Security:** Secure JWT authentication with role-based access to create trips, invite members, and select transport modes.
* [cite_start]**Smart Budgeting:** A dedicated finance engine that uses formulas to estimate budgets, track daily expenses, and visualize spending via charts[cite: 1].
* [cite_start]**Interactive Route Planning:** Integration with Google Maps and Places API to generate routes, calculate travel times, and locate nearby hotels/restaurants.
* [cite_start]**Timeline & Gamification:** A drag-and-drop itinerary builder that includes real-time notifications for reminders and an achievement badge system.
* [cite_start]**Trip Weather Intelligence:** A specialized module that provides outfit and activity suggestions based on weather rules, alongside a digital "Trip Memories" map.

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | ![Angular](https://img.shields.io/badge/Angular-DD0031?style=flat&logo=angular&logoColor=white) | [cite_start]Handles all UI components including Maps and Dashboards[cite: 2]. |
| **Backend** | ![.NET](https://img.shields.io/badge/.NET-512BD4?style=flat&logo=dotnet&logoColor=white) | [cite_start]Manages API endpoints, business logic, and calculations[cite: 2]. |
| **Database** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white) | [cite_start]Stores Collections for Trips, Routes, Budgets, and Weather Logs[cite: 2]. |
| **APIs** | **Google Maps, WeatherAPI** | [cite_start]Used for location services and forecast data[cite: 2]. |

## 👥 Team 43 - Workload Distribution

The project is divided into 5 core modules, assigned as follows:

| Member | Main Modules | Key Responsibilities |
| :--- | :--- | :--- |
| **Member 01 - Dinuri Thathsarani** | **Trip Management & User Access** | [cite_start]Trip creation, transport selection, JWT authentication, member invites, and role assignment[cite: 1]. |
| **Member 02 - Sasini Hansani** | **Budget Estimation & Tracking** | [cite_start]Implementing budget calculation formulas, expense CRUD operations, and generating budget charts/warnings[cite: 1]. |
| **Member 03 - Sandali Kodippili** | **Route Planner & Finder** | [cite_start]Google Maps integration, route display, travel time calculation, and fetching Hotel/Restaurant data via Places API[cite: 1]. |
| **Member 04 - Nirasha Wijesinghe** | **Timeline & Notifications** | [cite_start]Building the drag-and-drop timeline, notification scheduler, budget accuracy alerts, and the badge system[cite: 1]. |
| **Member 05 - Malpawani Poornima** | **Trip Weather & Memories** | [cite_start]Implementing WeatherAPI rules, outfit suggestions, memories upload CRUD, and the interactive memories map[cite: 1]. |

## 💻 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (Latest LTS)
* [.NET SDK](https://dotnet.microsoft.com/download)
* [MongoDB](https://www.mongodb.com/try/download/community)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/mashi33/Software-Project---Level-2.git](https://github.com/mashi33/Software-Project---Level-2.git)
    ```

2.  **Setup Backend (.NET)**
    ```bash
    cd Backend
    dotnet restore
    dotnet run
    ```

3.  **Setup Frontend (Angular)**
    ```bash
    cd Frontend
    npm install
    ng serve --open
    ```

## 📜 License
This project is created for the Level 2 Software Project assessment.
>>>>>>> 085e09d538ae49446191156fe5f313403cf71ec8
