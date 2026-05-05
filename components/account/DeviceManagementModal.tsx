import React, { useState, useEffect } from 'react';
import { X, Monitor, Smartphone, Tablet, Tv, LogOut } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Device } from '../../types';

interface DeviceManagementModalProps {
    onClose: () => void;
}

const DeviceManagementModal: React.FC<DeviceManagementModalProps> = ({ onClose }) => {
    const { getDevices, logoutDevice, logoutAllDevices, currentUser } = useStore();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDevices = async () => {
        if (currentUser?.isGuest) return;
        setLoading(true);
        const data = await getDevices();
        setDevices(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchDevices();
    }, [currentUser]);

    if (currentUser?.isGuest) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-[#181818] rounded-2xl w-full max-w-md p-6 border border-white/10 text-center">
                    <h2 className="text-xl font-bold mb-4">Device Management</h2>
                    <p className="text-gray-400 mb-6">Guest users cannot manage devices. Please sign in to access this feature.</p>
                    <button onClick={onClose} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const handleSignOutSingle = async (deviceId: string) => {
        if (confirm("Sign out of this device?")) {
            await logoutDevice(deviceId);
            await fetchDevices(); // Refresh list
        }
    };

    const handleSignOutAll = async () => {
        if (confirm("Are you sure you want to sign out of all devices? You will be signed out immediately.")) {
            await logoutAllDevices();
            onClose();
        }
    };

    const getIcon = (type: Device['type']) => {
        switch (type) {
            case 'mobile': return <Smartphone size={24} />;
            case 'tablet': return <Tablet size={24} />;
            case 'tv': return <Tv size={24} />;
            default: return <Monitor size={24} />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#181818] w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">

                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Manage Devices</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <X className="text-white" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">

                    <div className="bg-[#222] p-6 rounded-lg border border-white/10 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Sign out of all devices</h3>
                            <p className="text-sm text-gray-400">This will sign you out of all devices, including this one. You'll need to sign in again.</p>
                        </div>
                        <button
                            onClick={handleSignOutAll}
                            className="whitespace-nowrap bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition flex items-center gap-2"
                        >
                            <LogOut size={20} /> Sign Out All
                        </button>
                    </div>

                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Active Devices</h3>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {devices.map(device => (
                                <div key={device.id} className="flex items-center justify-between bg-[#222] p-4 rounded-lg border border-white/5 group">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/10 p-2 rounded text-gray-300">
                                            {getIcon(device.type)}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold flex items-center gap-2">
                                                {device.name}
                                                {device.isCurrent && <span className="bg-green-600 text-xs px-2 py-0.5 rounded">This Device</span>}
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                Last active: {new Date(device.lastActiveAt).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {device.ipAddress ? `IP: ${device.ipAddress}` : 'Location unknown'}
                                            </div>
                                        </div>
                                    </div>
                                    {!device.isCurrent && (
                                        <button 
                                            onClick={() => handleSignOutSingle(device.id)}
                                            className="text-red-500 hover:text-red-400 text-sm font-bold transition px-4 py-2 bg-red-500/10 rounded-lg hover:bg-red-500/20"
                                        >
                                            Sign Out
                                        </button>
                                    )}
                                </div>
                            ))}
                            {devices.length === 0 && !loading && (
                                <p className="text-center text-gray-500 py-10">No active devices found.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeviceManagementModal;
