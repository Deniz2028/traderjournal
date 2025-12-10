import React from "react";
import "./assets/main.css";
import { Route, Switch, Router } from "wouter";

import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import MorningAnalysisPage from "./pages/MorningAnalysisPage";
import { TodayPage } from "./pages/TodayPage";
import CalendarPage from "./pages/CalendarPage"; // Note: CalendarPage is default export now
import { SettingsPage } from "./pages/SettingsPage";
import EODReviewPage from "./pages/EODReviewPage";

export const App: React.FC = () => {
    return (
        <Router>
            <div className="app-container">
                <Sidebar />
                <main className="main-content">
                    <Switch>
                        <Route path="/" component={DashboardPage} />
                        <Route path="/dashboard" component={DashboardPage} />
                        {/* Date specific morning analysis */}
                        <Route path="/morning/:date" component={MorningAnalysisPage} />
                        <Route path="/morning" component={MorningAnalysisPage} />
                        {/* If we want date param support in future: <Route path="/morning/:date" ... /> */}

                        <Route path="/today" component={TodayPage} />
                        <Route path="/calendar" component={CalendarPage} />
                        <Route path="/eod/:date" component={EODReviewPage} />
                        <Route path="/settings" component={SettingsPage} />

                        {/* Fallback */}
                        <Route>
                            {(_params) => <DashboardPage />}
                        </Route>
                    </Switch>
                </main>
            </div>
        </Router>
    );
};

export default App;
