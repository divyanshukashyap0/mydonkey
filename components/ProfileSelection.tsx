import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Profile } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const ProfileSelection = () => {
  const { currentUser, switchProfile, addProfile, deleteProfile } = useStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isKids, setIsKids] = useState(false);
  const [loading, setLoading] = useState(true);

  const avatars = [
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-v78u9z60vv97xlj9.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-2fg93tmwo97u63p5.jpg',
    'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-v7a31y8sq5tky68b.jpg',
  ];

  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);

  // Sync Profiles for this specific user
  useEffect(() => {
    if (!currentUser) return;

    // Safety timeout: if snapshot takes too long, stop loading
    const safetyTimer = setTimeout(() => setLoading(false), 3000);

    let unsub = () => { };
    try {
      unsub = onSnapshot(collection(db, 'users', currentUser.uid, 'profiles'), (snap) => {
        setProfiles(snap.docs.map(d => d.data() as Profile));
        setLoading(false);
        clearTimeout(safetyTimer);
      }, (err) => {
        console.error("Profile sync error:", err);
        setLoading(false); // Stop loading on error
        clearTimeout(safetyTimer);
      });
    } catch (e) {
      console.error("Profile sync setup error:", e);
      setLoading(false);
    }

    return () => {
      unsub();
      clearTimeout(safetyTimer);
    };
  }, [currentUser]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addProfile(newName, isKids, selectedAvatar);
    } catch (e) {
      console.error("Add profile exception:", e);
      // Fallback for demo/offline: simulated profile
      const fakeId = `temp_${Date.now()}`;
      const fakeProfile: Profile = {
        id: fakeId,
        name: newName,
        isKids,
        avatarUrl: selectedAvatar,
        myList: []
      };
      setProfiles(prev => [...prev, fakeProfile]);
    }
    setIsAdding(false);
    setNewName('');
    setIsKids(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this profile?')) {
      try {
        await deleteProfile(id);
      } catch (error) {
        console.error("Delete failed locally", error);
        setProfiles(prev => prev.filter(p => p.id !== id));
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white flex-col gap-4">
      <div className="w-12 h-12 border-4 border-brand-red border-t-white rounded-full animate-spin" />
      <p className="text-xs text-gray-500">Loading profiles...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-500">
      <div className="mb-12">
        <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-16 md:h-20 w-auto object-contain" alt="MY DONKEY Logo" />
      </div>

      <h1 className="text-3xl md:text-5xl font-medium mb-8 md:mb-12">Who's watching?</h1>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8 px-4 max-w-4xl">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="group flex flex-col items-center gap-4 cursor-pointer relative"
            onClick={() => !isEditing && switchProfile(profile.id)}
          >
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded overflow-hidden border-2 transition-all duration-300 ${isEditing ? 'border-gray-500 scale-95 opacity-50' : 'border-transparent group-hover:border-white group-hover:scale-105'}`}>
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <button
                    onClick={(e) => handleDelete(e, profile.id)}
                    className="p-2 bg-black/60 rounded-full hover:bg-brand-red transition-colors"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              )}
            </div>
            <span className="text-gray-400 group-hover:text-white transition-colors md:text-xl font-medium">{profile.name}</span>
            {profile.isKids && (
              <span className="absolute -top-2 -right-2 bg-brand-red text-[10px] px-1.5 py-0.5 rounded font-black tracking-tighter">KIDS</span>
            )}
          </div>
        ))}

        {profiles.length < 5 && !isAdding && (
          <div
            className="group flex flex-col items-center gap-4 cursor-pointer"
            onClick={() => setIsAdding(true)}
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
          onClick={() => setIsEditing(!isEditing)}
          className="px-6 md:px-8 py-2 border border-gray-500 text-gray-500 text-lg md:text-xl hover:text-white hover:border-white transition-colors tracking-widest uppercase"
        >
          {isEditing ? 'Done' : 'Manage Profiles'}
        </button>
      </div>

      {/* Add Profile Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-xl bg-[#141414] p-8 md:p-12 rounded-lg relative border border-white/5">
            <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={32} /></button>

            <h2 className="text-3xl md:text-5xl font-bold mb-8">Add Profile</h2>
            <p className="text-gray-400 mb-8 border-b border-white/10 pb-4">Add a profile for another person watching on My Donkey.</p>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded overflow-hidden">
                  <img src={selectedAvatar} className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2">
                  {avatars.map(url => (
                    <button
                      key={url}
                      onClick={() => setSelectedAvatar(url)}
                      className={`w-6 h-6 rounded-full overflow-hidden border-2 transition ${selectedAvatar === url ? 'border-brand-red scale-110' : 'border-transparent opacity-50'}`}
                    >
                      <img src={url} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full space-y-6">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-gray-600 p-3 outline-none focus:ring-1 ring-white placeholder:text-gray-300"
                />

                <div className="flex items-center gap-4 py-4 border-t border-b border-white/10">
                  <input
                    type="checkbox"
                    id="kids-check"
                    checked={isKids}
                    onChange={(e) => setIsKids(e.target.checked)}
                    className="w-6 h-6 rounded bg-gray-600 border-none outline-none focus:ring-1 ring-brand-red"
                  />
                  <label htmlFor="kids-check" className="text-xl">Kid?</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleAdd}
                    className="px-8 py-2 bg-white text-black font-bold uppercase tracking-widest hover:bg-brand-red hover:text-white transition"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="px-8 py-2 border border-gray-500 text-gray-500 font-bold uppercase tracking-widest hover:border-white hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelection;