import { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { API_BASE_URL } from '../config';

const InventoryAlerts = () => {
    const { selectedPharmacyId } = usePharmacy();
    const [alerts, setAlerts] = useState(null);
    const [forecastAlerts, setForecastAlerts] = useState(null);
    const [loading, setLoading] = useState(false);
    const [daysThreshold, setDaysThreshold] = useState(120);

    useEffect(() => {
        if (selectedPharmacyId) {
            fetchAlerts();
            fetchForecastAlerts();
        } else {
            setAlerts(null);
            setForecastAlerts(null);
        }
    }, [selectedPharmacyId, daysThreshold]);

    const fetchAlerts = async () => {
        if (!selectedPharmacyId) return;
        setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/inventory/alerts?pharmacy_id=${selectedPharmacyId}&days=${daysThreshold}`,
                { credentials: 'include' }
            );
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchForecastAlerts = async () => {
        if (!selectedPharmacyId) return;
        try {
            const res = await fetch(
                `${API_BASE_URL}/inventory/forecast-alerts?pharmacy_id=${selectedPharmacyId}`,
                { credentials: 'include' }
            );
            if (res.ok) {
                const data = await res.json();
                setForecastAlerts(data);
            }
        } catch (err) {
            console.error('Failed to fetch forecast alerts', err);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-500' };
            case 'warning': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500' };
            case 'info': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-500' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-500' };
        }
    };

    const SeverityBadge = ({ severity }) => {
        const colors = getSeverityColor(severity);
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide text-white ${colors.badge}`}>
                {severity}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const getItemDisplay = (item) => {
        let display = item.generic_name;
        if (item.brand_name) display += ` (${item.brand_name})`;
        if (item.strength_mg && item.strength_unit) {
            display += ` - ${item.strength_mg}${item.strength_unit}`;
        }
        if (item.form) display += ` ${item.form}`;
        return display;
    };

    const totalAlerts = (alerts?.summary?.total_alerts || 0) + (forecastAlerts?.summary?.total_alerts || 0);

    // Alert Section Card Component
    const AlertSection = ({ icon, title, count, description, children, accentColor = 'indigo' }) => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {/* Section Header */}
            <div className={`px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-${accentColor}-50 to-white`}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-slate-800">
                            {title}
                            <span className={`ml-2 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-${accentColor}-100 text-${accentColor}-700`}>
                                {count}
                            </span>
                        </h2>
                        {description && (
                            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
            </div>
            {/* Section Content */}
            <div className="p-6">
                {children}
            </div>
        </div>
    );

    // Styled Table Component
    const StyledTable = ({ headers, children }) => (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {headers.map((header, idx) => (
                            <th
                                key={idx}
                                className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${header.align === 'right' ? 'text-right' : ''} ${header.minWidth || ''}`}
                            >
                                {header.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {children}
                </tbody>
            </table>
        </div>
    );

    // Alert Row Component
    const AlertRow = ({ alert, children, severity }) => {
        const colors = getSeverityColor(severity);
        return (
            <tr className={`${colors.bg} hover:brightness-95 transition-all`}>
                {children}
            </tr>
        );
    };

    // Table Cell Component
    const Td = ({ children, align = 'left', mono = false, bold = false, className = '' }) => (
        <td className={`px-4 py-3.5 ${align === 'right' ? 'text-right' : ''} ${mono ? 'font-mono' : ''} ${bold ? 'font-semibold' : ''} ${className}`}>
            {children}
        </td>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Inventory Alerts
                </h1>
                <p className="text-slate-500 mt-1">
                    Proactive monitoring for expiring stock, low inventory, FIFO compliance, and smart forecasts
                </p>
            </div>

            {!selectedPharmacyId ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="text-5xl mb-4">🏪</div>
                    <p className="text-lg text-slate-600">Please select a pharmacy from the header dropdown to view alerts.</p>
                </div>
            ) : loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-slate-600">Loading alerts...</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center hover:shadow-md transition-shadow">
                            <div className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {totalAlerts}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-2">Total Alerts</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-red-500 border border-slate-200 p-6 text-center hover:shadow-md transition-shadow">
                            <div className="text-4xl font-extrabold text-red-600">
                                {(alerts?.summary?.critical || 0) + (forecastAlerts?.summary?.critical || 0)}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-2">Critical</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-amber-500 border border-slate-200 p-6 text-center hover:shadow-md transition-shadow">
                            <div className="text-4xl font-extrabold text-amber-600">
                                {(alerts?.summary?.warning || 0) + (forecastAlerts?.summary?.warning || 0)}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-2">Warning</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 p-6 text-center hover:shadow-md transition-shadow">
                            <div className="text-4xl font-extrabold text-blue-600">
                                {(alerts?.summary?.info || 0) + (forecastAlerts?.summary?.info || 0)}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-2">Info</div>
                        </div>
                    </div>

                    {/* Controls Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-8">
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                                Expiry Alert Threshold:
                            </label>
                            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                <input
                                    type="range"
                                    min="30"
                                    max="180"
                                    step="30"
                                    value={daysThreshold}
                                    onChange={(e) => setDaysThreshold(parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-sm min-w-[80px]">
                                    {daysThreshold} days
                                </span>
                            </div>
                            <button
                                onClick={() => { fetchAlerts(); fetchForecastAlerts(); }}
                                className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                            >
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {totalAlerts === 0 ? (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-12 text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                                <span className="text-4xl">✓</span>
                            </div>
                            <h3 className="text-xl font-bold text-emerald-800 mb-2">No Alerts at This Time</h3>
                            <p className="text-emerald-600">Inventory is healthy! All stock levels are adequate and no items are expiring soon.</p>
                        </div>
                    ) : (
                        <>
                            {/* Expiring Soon Section */}
                            {alerts?.expiring_soon?.length > 0 && (
                                <AlertSection
                                    icon="⏰"
                                    title="Expiring Soon"
                                    count={alerts.expiring_soon.length}
                                    accentColor="red"
                                >
                                    <StyledTable headers={[
                                        { label: 'Severity' },
                                        { label: 'Item', minWidth: 'min-w-[250px]' },
                                        { label: 'Batch No' },
                                        { label: 'Expiry Date' },
                                        { label: 'Days Left', align: 'right' },
                                        { label: 'Qty', align: 'right' }
                                    ]}>
                                        {alerts.expiring_soon.map((alert, idx) => (
                                            <AlertRow key={idx} severity={alert.severity}>
                                                <Td><SeverityBadge severity={alert.severity} /></Td>
                                                <Td bold className="text-slate-800">{getItemDisplay(alert)}</Td>
                                                <Td mono bold className="text-slate-600">{alert.batch_no}</Td>
                                                <Td className="text-slate-600">{formatDate(alert.expiry_date)}</Td>
                                                <Td align="right" bold className={getSeverityColor(alert.severity).text}>
                                                    {alert.days_until_expiry}
                                                </Td>
                                                <Td align="right" className="text-slate-700">{alert.qty_on_hand_units}</Td>
                                            </AlertRow>
                                        ))}
                                    </StyledTable>
                                </AlertSection>
                            )}

                            {/* Low Stock Section */}
                            {alerts?.low_stock?.length > 0 && (
                                <AlertSection
                                    icon="📦"
                                    title="Low Stock"
                                    count={alerts.low_stock.length}
                                    accentColor="amber"
                                >
                                    <StyledTable headers={[
                                        { label: 'Severity' },
                                        { label: 'Item', minWidth: 'min-w-[250px]' },
                                        { label: 'Current Stock', align: 'right' },
                                        { label: 'Reorder Level', align: 'right' },
                                        { label: 'Batches', align: 'right' }
                                    ]}>
                                        {alerts.low_stock.map((alert, idx) => (
                                            <AlertRow key={idx} severity={alert.severity}>
                                                <Td><SeverityBadge severity={alert.severity} /></Td>
                                                <Td bold className="text-slate-800">{getItemDisplay(alert)}</Td>
                                                <Td align="right" bold className={getSeverityColor(alert.severity).text}>
                                                    {alert.total_stock}
                                                </Td>
                                                <Td align="right" className="text-slate-600">{alert.reorder_level}</Td>
                                                <Td align="right" className="text-slate-600">{alert.batch_count}</Td>
                                            </AlertRow>
                                        ))}
                                    </StyledTable>
                                </AlertSection>
                            )}

                            {/* Smart Forecast Alerts Section */}
                            {forecastAlerts?.forecast_alerts?.length > 0 && (
                                <AlertSection
                                    icon="📊"
                                    title="Smart Forecast Alerts"
                                    count={forecastAlerts.forecast_alerts.length}
                                    description="Based on dispensing patterns from the last 90 days, these batches are projected to have leftover stock at expiry."
                                    accentColor="purple"
                                >
                                    <StyledTable headers={[
                                        { label: 'Severity' },
                                        { label: 'Item', minWidth: 'min-w-[180px]' },
                                        { label: 'Batch No' },
                                        { label: 'Expiry' },
                                        { label: 'Days', align: 'right' },
                                        { label: 'On Hand', align: 'right' },
                                        { label: 'Avg/Day', align: 'right' },
                                        { label: 'Projected', align: 'right' },
                                        { label: 'Risk Units', align: 'right' },
                                        { label: 'Suggested Actions', minWidth: 'min-w-[220px]' }
                                    ]}>
                                        {forecastAlerts.forecast_alerts.map((alert, idx) => (
                                            <AlertRow key={idx} severity={alert.severity}>
                                                <Td><SeverityBadge severity={alert.severity} /></Td>
                                                <Td bold className="text-slate-800">{getItemDisplay(alert)}</Td>
                                                <Td mono bold className="text-slate-600">{alert.batch_no}</Td>
                                                <Td className="text-slate-600">{formatDate(alert.expiry_date)}</Td>
                                                <Td align="right" bold className={getSeverityColor(alert.severity).text}>
                                                    {alert.days_to_expiry}
                                                </Td>
                                                <Td align="right" className="text-slate-700">{alert.qty_on_hand_units}</Td>
                                                <Td align="right" mono className="text-slate-600">{alert.avg_daily_usage}</Td>
                                                <Td align="right" mono className="text-slate-600">{alert.projected_usage_until_expiry}</Td>
                                                <Td align="right" bold className={`text-lg ${getSeverityColor(alert.severity).text}`}>
                                                    {alert.risk_units}
                                                </Td>
                                                <Td className="text-slate-500 text-sm leading-snug">{alert.suggested_actions}</Td>
                                            </AlertRow>
                                        ))}
                                    </StyledTable>
                                </AlertSection>
                            )}

                            {/* FIFO Warnings Section */}
                            {alerts?.fifo_warnings?.length > 0 && (
                                <AlertSection
                                    icon="⚠️"
                                    title="FIFO Warnings"
                                    count={alerts.fifo_warnings.length}
                                    accentColor="orange"
                                >
                                    <StyledTable headers={[
                                        { label: 'Severity' },
                                        { label: 'Item', minWidth: 'min-w-[200px]' },
                                        { label: 'Older Batch' },
                                        { label: 'Expiry' },
                                        { label: 'Qty', align: 'right' },
                                        { label: 'Message', minWidth: 'min-w-[280px]' }
                                    ]}>
                                        {alerts.fifo_warnings.map((alert, idx) => (
                                            <AlertRow key={idx} severity={alert.severity}>
                                                <Td><SeverityBadge severity={alert.severity} /></Td>
                                                <Td bold className="text-slate-800">{getItemDisplay(alert)}</Td>
                                                <Td mono bold className="text-slate-600">{alert.older_batch_no}</Td>
                                                <Td className="text-slate-600">{formatDate(alert.older_expiry)}</Td>
                                                <Td align="right" bold className="text-slate-700">{alert.older_qty}</Td>
                                                <Td className="text-slate-500 text-sm leading-snug">{alert.message}</Td>
                                            </AlertRow>
                                        ))}
                                    </StyledTable>
                                </AlertSection>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default InventoryAlerts;
