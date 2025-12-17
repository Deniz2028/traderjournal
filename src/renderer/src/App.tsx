import React from "react";
import "./assets/main.css";
import { ThemeProvider } from "./context/ThemeContext";
import { Route, Switch, Router } from "wouter";

import { Sidebar } from "./components/Sidebar";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DashboardPage } from "./pages/DashboardPage";
import MorningAnalysisPage from "./pages/MorningAnalysisPage";
import { TodayPage } from "./pages/TodayPage";
import CalendarPage from "./pages/CalendarPage";
import { AchievementsPage } from "./pages/AchievementsPage";
import { RulesPage } from "./pages/RulesPage";
import { AdvancedAnalysisPage } from "./pages/AdvancedAnalysisPage";
import { SettingsPage } from "./pages/SettingsPage";
import { EodReviewPage as EODReviewPage } from "./pages/EODReviewPage";
import { CollabPage } from "./pages/CollabPage";
import { NewsPanel } from "./components/NewsPanel";
import { TvAlertListener } from "./components/TvAlertListener";

export const App: React.FC = () => {
    return (
        <ThemeProvider>
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

                            <Route path="/today" component={TodayPage} />
                            <Route path="/calendar" component={CalendarPage} />
                            <Route path="/eod/:date" component={EODReviewPage} />
                            <Route path="/collab" component={CollabPage} />
                            <Route path="/settings" component={SettingsPage} />

                            {/* News route if want to view full page, though we have panel now */}
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

                    {/* Global Components */}
                    <TvAlertListener />
                </div>
            </Router>
        </ThemeProvider>
    );
};

export default App;
