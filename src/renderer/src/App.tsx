import React from "react";
import "./assets/main.css";
import { ThemeProvider } from "./context/ThemeContext";
import { Route, Switch, Router } from "wouter";
import { useHashLocation } from "./hooks/useHashLocation";

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
import { BacktestPage } from "./pages/BacktestPage";
import { BacktestSessionPage } from "./pages/BacktestSessionPage";
import { NewsPanel } from "./components/NewsPanel";

export const App: React.FC = () => {
    return (
        <ThemeProvider>
            <Router hook={useHashLocation}>
                <div className="app-container">
                    <Sidebar />
                    <main className="main-content">
                        <Switch>
                            <Route path="/" component={DashboardPage} />
                            <Route path="/dashboard" component={DashboardPage} />
                            <Route path="/analytics" component={AnalyticsPage} />
                            <Route path="/backtest" component={BacktestPage} />
                            <Route path="/backtest/:id" component={BacktestSessionPage} />
                            <Route path="/advanced" component={AdvancedAnalysisPage} />
                            <Route path="/rules" component={RulesPage} />
                            <Route path="/achievements" component={AchievementsPage} />

                            {/* Date specific morning analysis */}
                            <Route path="/morning/:date" component={MorningAnalysisPage} />
                            <Route path="/morning" component={MorningAnalysisPage} />

                            <Route path="/today" component={TodayPage} />
                            <Route path="/calendar" component={CalendarPage} />
                            <Route path="/today" component={TodayPage} />
                            <Route path="/calendar" component={CalendarPage} />
                            <Route path="/backtest" component={BacktestPage} />
                            <Route path="/eod/:date" component={EODReviewPage} />

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


                </div>
            </Router>
        </ThemeProvider>
    );
};

export default App;
