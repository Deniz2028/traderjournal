import React from "react";
import "./assets/main.css";
import { Route, Switch, Router } from "wouter";

import { Sidebar } from "./components/Sidebar";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DashboardPage } from "./pages/DashboardPage";
import MorningAnalysisPage from "./pages/MorningAnalysisPage";
import { TodayPage } from "./pages/TodayPage";
import CalendarPage from "./pages/CalendarPage"; // Note: CalendarPage is default export now
import { UtilsPage } from "./pages/UtilsPage"; // Removed if unused
import { AchievementsPage } from "./pages/AchievementsPage";
import { RulesPage } from "./pages/RulesPage";
import { AdvancedAnalysisPage } from "./pages/AdvancedAnalysisPage";
import { SettingsPage } from "./pages/SettingsPage";
import EODReviewPage from "./pages/EODReviewPage";
import { NewsPanel } from "./components/NewsPanel";

export const App: React.FC = () => {
    return (
        <Router>
            <div className="app-container">
                <Sidebar />
                <main className="main-content">
                    <Switch>
                        <Route path="/" component={DashboardPage} />
                        <Route path="/dashboard" component={DashboardPage} />
                        <Route path="/analytics" component={AnalyticsPage} />
                        <Route path="/advanced" component={AdvancedAnalysisPage} />
                        <Route path="/rules" component={RulesPage} />
                        <Route path="/achievements" component={AchievementsPage} />
                        {/* Date specific morning analysis */}
                        <Route path="/morning/:date" component={MorningAnalysisPage} />
                        <Route path="/morning" component={MorningAnalysisPage} />
                        {/* If we want date param support in future: <Route path="/morning/:date" ... /> */}

                        <Route path="/today" component={TodayPage} />
                        <Route path="/calendar" component={CalendarPage} />
                        <Route path="/calendar" component={CalendarPage} />
                        <Route path="/eod/:date" component={EODReviewPage} />
                        <Route path="/settings" component={SettingsPage} />
                        <Route path="/news">
                            <div style={{ padding: 24 }}>
                                <NewsPanel />
                            </div>
                        </Route>

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
