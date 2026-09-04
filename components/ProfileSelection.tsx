import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, Trash2, Camera } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Profile } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Loader from './Loader';

const ProfileSelection = () => {
  const { currentUser, switchProfile, addProfile, deleteProfile, updateProfile } = useStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mode, setMode] = useState<'select' | 'manage' | 'edit' | 'add'>('select');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [isKids, setIsKids] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [loading, setLoading] = useState(true);

  const avatars = [
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-v78u9z60vv97xlj9.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-2fg93tmwo97u63p5.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-v7a31y8sq5tky68b.jpg',
  ];

  useEffect(() => {
    if (!currentUser) return;
    const safetyTimer = setTimeout(() => setLoading(false), 3000);
    const unsub = onSnapshot(collection(db, 'users', currentUser.uid, 'profiles'), (snap) => {
      setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Profile)));
      setLoading(false);
      clearTimeout(safetyTimer);
    }, (err) => {
      console.error("Profile sync error:", err);
      setLoading(false);
    });
    return () => { unsub(); clearTimeout(safetyTimer); };
  }, [currentUser?.uid]);

  const startAdd = () => {
    setMode('add');
    setName('');
    setIsKids(false);
    setSelectedAvatar(avatars[0]);
  };

  const startEdit = (profile: Profile) => {
    setMode('edit');
    setEditingProfileId(profile.id);
    setName(profile.name);
    setIsKids(profile.isKids);
    setSelectedAvatar(profile.avatarUrl);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (mode === 'add') {
      const newProfile = await addProfile(name, isKids, selectedAvatar);
      if (newProfile) {
        switchProfile(newProfile);
        return; // Exit to trigger re-render / nav
      }
    } else if (mode === 'edit' && editingProfileId) {
      await updateProfile(editingProfileId, { name, isKids, avatarUrl: selectedAvatar });
    }
    setMode('manage');
  };

  const handleDelete = async () => {
    if (mode === 'edit' && editingProfileId) {
      if (profiles.length <= 1) {
        alert('You cannot delete your only profile. An account must keep at least one profile.');
        return;
      }
      if (window.confirm('Are you sure you want to delete this profile?')) {
        try {
          await deleteProfile(editingProfileId);
          setEditingProfileId(null);
          setMode('select');
        } catch (err: any) {
          alert(`Failed to delete profile: ${err.message || err}`);
        }
      }
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const [videoDone, setVideoDone] = useState(false);

  // Reset videoDone if loading starts again (though usually component unmounts/remounts or loading is strictly true/false)
  useEffect(() => {
    if (loading) setVideoDone(false);
  }, [loading]);

  if (loading || !videoDone) return (
    <Loader
      dataReady={!loading}
      onComplete={() => setVideoDone(true)}
    />
  );

  // Render Modal for Add/Edit
  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center text-white animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-2xl p-4 md:p-8">
          <h1 className="text-3xl md:text-5xl font-medium mb-4">{mode === 'add' ? 'Add Profile' : 'Edit Profile'}</h1>
          <div className="border-t border-gray-600 mb-6" />

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Avatar Section */}
            <div className="relative group w-32 h-32 md:w-40 md:h-40 mx-auto md:mx-0">
              <img src={selectedAvatar} className="w-full h-full rounded shadow-lg object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded cursor-pointer opacity-0 group-hover:opacity-100 transition">
                <Edit2 className="text-white" />
              </div>
              {/* Simple Avatar Picker Popup could go here, for now just use the default set cycling or internal logic if expanded */}
            </div>

            {/* Form Section */}
            <div className="flex-1 space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full bg-[#666] text-white px-4 py-2 text-lg rounded placeholder-gray-300 focus:outline-none focus:bg-[#555]"
              />

              <div className="order-t border-gray-600 py-4">
                <h3 className="text-lg text-gray-200 mb-2">Maturity Settings:</h3>
                <div className="flex items-center gap-3 p-3 bg-[#333] rounded cursor-pointer" onClick={() => setIsKids(!isKids)}>
                  <div className={`w-6 h-6 border-2 flex items-center justify-center ${isKids ? 'bg-brand-red border-transparent' : 'border-gray-400'}`}>
                    {isKids && <Check size={16} />}
                  </div>
                  <span className="font-bold">{isKids ? 'Kid Protocol Enabled' : 'Standard Protocol'}</span>
                </div>
              </div>

              {/* Avatar Selection Grid (Mini) */}
              <div className="py-2">
                <p className="text-sm text-gray-400 mb-2">Choose Avatar:</p>
                <div className="flex gap-2">
                  {avatars.map(url => (
                    <img
                      key={url}
                      src={url}
                      onClick={() => setSelectedAvatar(url)}
                      className={`w-10 h-10 rounded cursor-pointer transition ${selectedAvatar === url ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-600 mt-8 pt-8 flex gap-4">
            <button
              onClick={handleSave}
              className="bg-white text-black px-8 py-2 font-bold text-lg hover:bg-brand-red hover:text-white transition"
            >
              Save
            </button>
            <button
              onClick={() => setMode('manage')}
              className="border border-gray-500 text-gray-500 px-8 py-2 font-bold text-lg hover:border-white hover:text-white transition"
            >
              Cancel
            </button>
            {mode === 'edit' && (
              <button
                onClick={handleDelete}
                className="ml-auto border border-gray-500 text-gray-500 px-8 py-2 font-bold text-lg hover:border-brand-red hover:text-brand-red transition"
              >
                Delete Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Selection / Manage View
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-500">
      <div className="mb-8 flex flex-col items-center">
        <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-16 md:h-20 w-auto object-contain mb-8" alt="MY DONKEY Logo" />
        {mode === 'select' && (
          <div className="text-center mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <h2 className="text-xl md:text-2xl font-light text-brand-red mb-1">{getGreeting()}, <span className="font-bold text-white">{currentUser?.name || 'Guest'}</span></h2>
          </div>
        )}
      </div>

      <h1 className="text-3xl md:text-5xl font-medium mb-8 md:mb-12">
        {mode === 'manage' ? 'Manage Profiles' : "Who's watching?"}
      </h1>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8 px-4 max-w-4xl">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="group flex flex-col items-center gap-4 cursor-pointer relative"
            onClick={() => mode === 'manage' ? startEdit(profile) : switchProfile(profile.id)}
          >
            <div className="relative">
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded overflow-hidden border-2 transition-all duration-300 ${mode === 'manage' ? 'opacity-50' : 'border-transparent group-hover:border-white group-hover:scale-105'}`}>
                <img src={profile.avatarUrl || "/Mydonkey%20user.jpg"} alt={profile.name} className="w-full h-full object-cover" />
              </div>
              {mode === 'manage' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 p-2 rounded-full border border-white">
                    <Edit2 size={24} />
                  </div>
                </div>
              )}
            </div>
            <span className="text-gray-400 group-hover:text-white transition-colors md:text-xl font-medium">{profile.name}</span>
            {profile.isKids && (
              <span className="absolute -top-2 -right-2 bg-brand-red text-[10px] px-1.5 py-0.5 rounded font-black tracking-tighter">KIDS</span>
            )}
          </div>
        ))}

        {profiles.length < 5 && (
          <div
            className="group flex flex-col items-center gap-4 cursor-pointer"
            onClick={startAdd}
          >
            <div className="w-24 h-24 md:w-32 md:h-32 rounded flex items-center justify-center border-2 border-transparent group-hover:bg-white transition-all duration-300">
              <Plus size={48} className="text-gray-500 group-hover:text-[#141414]" />
            </div>
            <span className="text-gray-400 group-hover:text-white transition-colors md:text-xl font-medium">Add Profile</span>
          </div>
        )}
      </div>

      <div className="mt-16 md:mt-24 space-x-4">
        <button
          onClick={() => setMode(mode === 'manage' ? 'select' : 'manage')}
          className={`px-6 md:px-8 py-2 border text-lg md:text-xl transition-colors tracking-widest uppercase ${mode === 'manage' ? 'bg-white text-black font-bold border-white' : 'border-gray-500 text-gray-500 hover:text-white hover:border-white'}`}
        >
          {mode === 'manage' ? 'Done' : 'Manage Profiles'}
        </button>
      </div>
    </div>
  );
};

export default ProfileSelection;