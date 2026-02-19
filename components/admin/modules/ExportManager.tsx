import React from 'react';
import { Download, FileSpreadsheet, Users, Film, MessageSquare, Database, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import * as XLSX from 'xlsx';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../firebase';

const ExportManager = () => {
    const { content, users, contentRequests } = useStore();
    const [importing, setImporting] = React.useState(false);
    const [importStats, setImportStats] = React.useState<{ total: number; success: number; skipped: number; errors: number } | null>(null);

    const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportContent = () => {
        const data = content.map(c => ({
            ID: c.id,
            Title: c.title,
            Type: c.type,
            Genres: c.genres?.join(', '),
            ReleaseDate: c.release_date,
            Rating: c.vote_average,
            Featured: c.featured ? 'Yes' : 'No',
            Original: c.isOriginal ? 'Yes' : 'No',
            TrailerLink: c.youtubeId ? `https://www.youtube.com/watch?v=${c.youtubeId}` : 'N/A',
            PosterURL: c.poster_path,
            BackdropURL: c.backdrop_path,
            VideoURL: c.videoUrl || 'N/A',
            MovieDriveID: c.movieDriveId || 'N/A',
            MovieYoutubeID: c.movieYoutubeId || 'N/A',
            CreatedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
        }));
        exportToExcel(data, 'MyDonkey_Content', 'Content Library');
    };

    const handleExportUsers = () => {
        const data = users.map(u => ({
            UID: u.uid,
            Email: u.email,
            Role: u.role,
            Plan: u.plan,
            Status: u.status,
            Joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
            LastActive: u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : 'N/A'
        }));
        exportToExcel(data, 'MyDonkey_Users', 'User Base');
    };


    const handleExportRequests = () => {
        const data = contentRequests.map(r => ({
            ID: r.id,
            Title: r.contentTitle,
            UserEmail: r.userEmail,
            UserName: r.userName,
            Status: r.status,
            RequestedAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'
        }));
        exportToExcel(data, 'MyDonkey_Requests', 'Content Requests');
    };

    const getEpisodesData = () => {
        const episodesData: any[] = [];
        content.forEach(c => {
            if (c.type === 'tv' && c.seasons) {
                c.seasons.forEach(s => {
                    s.episodes.forEach(e => {
                        episodesData.push({
                            SeriesID: c.id,
                            SeriesTitle: c.title,
                            Season: s.seasonNumber,
                            EpisodeNumber: e.episodeNumber,
                            EpisodeTitle: e.title,
                            VideoURL: e.videoUrl || 'N/A',
                            DriveID: e.driveId || 'N/A',
                            YoutubeID: e.youtubeId || 'N/A',
                            Duration: e.duration || 'N/A',
                            Description: e.overview || 'N/A'
                        });
                    });
                });
            }
        });
        return episodesData;
    };

    const handleExportAll = () => {
        const wb = XLSX.utils.book_new();

        // Content Sheet
        const contentData = content.map(c => ({
            ID: c.id,
            Title: c.title,
            Type: c.type,
            Genres: c.genres?.join(', '),
            ReleaseDate: c.release_date,
            Rating: c.vote_average,
            Featured: c.featured ? 'Yes' : 'No',
            TrailerLink: c.youtubeId ? `https://www.youtube.com/watch?v=${c.youtubeId}` : 'N/A',
            PosterURL: c.poster_path,
            BackdropURL: c.backdrop_path,
            VideoURL: c.videoUrl || 'N/A',
            CreatedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
        }));
        const wsContent = XLSX.utils.json_to_sheet(contentData);
        XLSX.utils.book_append_sheet(wb, wsContent, 'Content');

        // Users Sheet
        const userData = users.map(u => ({
            UID: u.uid,
            Email: u.email,
            Role: u.role,
            Plan: u.plan,
            Status: u.status,
            Joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
            LastActive: u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : 'N/A'
        }));
        const wsUsers = XLSX.utils.json_to_sheet(userData);
        XLSX.utils.book_append_sheet(wb, wsUsers, 'Users');

        // Requests Sheet
        const requestData = contentRequests.map(r => ({
            ID: r.id,
            Title: r.contentTitle,
            UserEmail: r.userEmail,
            UserName: r.userName,
            Status: r.status,
            RequestedAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'
        }));
        const wsRequests = XLSX.utils.json_to_sheet(requestData);
        XLSX.utils.book_append_sheet(wb, wsRequests, 'Requests');

        // Episodes Sheet
        const episodesData = getEpisodesData();
        const wsEpisodes = XLSX.utils.json_to_sheet(episodesData);
        XLSX.utils.book_append_sheet(wb, wsEpisodes, 'Episodes');

        XLSX.writeFile(wb, `MyDonkey_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                Title: 'Example Movie',
                Overview: 'Description of the movie...',
                Type: 'movie', // movie, tv, short
                Genres: 'Action, Drama',
                ReleaseDate: '2024-01-01',
                Rating: 8.5,
                YoutubeID: 'dQw4w9WgXcQ',
                PosterURL: 'https://example.com/poster.jpg',
                BackdropURL: 'https://example.com/backdrop.jpg',
                VideoURL: 'https://example.com/video.mp4',
                MovieDriveID: '',
                MovieYoutubeID: '',
                Featured: 'No', // Yes or No
                Original: 'No', // Yes or No
                Duration: '2h 15m'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Import_Template');
        XLSX.writeFile(wb, 'MyDonkey_Content_Import_Template.xlsx');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportStats(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert('File is empty or invalid.');
                    setImporting(false);
                    return;
                }

                // Process Data with Batching (Max 500 per batch)
                const total = data.length;
                let processed = 0;
                let skipped = 0;
                const BATCH_SIZE = 450; // Safety margin below 500

                for (let i = 0; i < total; i += BATCH_SIZE) {
                    const chunk = data.slice(i, i + BATCH_SIZE);
                    const batch = writeBatch(db);
                    let batchCount = 0;

                    chunk.forEach((row: any) => {
                        const title = row.Title ? String(row.Title).trim() : 'Untitled';

                        // Check for duplicates in existing content (Case Insenstive)
                        const exists = content.some(c => c.title.toLowerCase() === title.toLowerCase());

                        if (exists) {
                            skipped++;
                            return; // Skip duplicate
                        }

                        const docRef = doc(collection(db, 'content'));
                        const newId = docRef.id;

                        const newItem: any = {
                            id: newId,
                            title: title,
                            overview: row.Overview || '',
                            type: (row.Type || 'movie').toLowerCase(),
                            genres: row.Genres ? row.Genres.split(',').map((g: string) => g.trim()) : [],
                            release_date: row.ReleaseDate || new Date().toISOString().split('T')[0],
                            vote_average: Number(row.Rating) || 0,
                            youtubeId: row.YoutubeID || '',
                            poster_path: row.PosterURL || '',
                            backdrop_path: row.BackdropURL || '',
                            videoUrl: row.VideoURL || '',
                            movieDriveId: row.MovieDriveID || '',
                            movieYoutubeId: row.MovieYoutubeID || '',
                            featured: (row.Featured || 'No').toLowerCase() === 'yes',
                            isOriginal: (row.Original || 'No').toLowerCase() === 'yes',
                            duration: row.Duration || '',
                            createdAt: new Date().toISOString(),
                            isPublished: true
                        };

                        batch.set(docRef, newItem);
                        batchCount++;
                    });

                    if (batchCount > 0) {
                        await batch.commit();
                        processed += batchCount;
                    }
                }

                // FORCE UPDATE VERSION
                if (processed > 0) {
                    await setDoc(doc(db, 'settings', 'global'), {
                        contentVersion: (settings?.contentVersion || 0) + 1
                    }, { merge: true });
                }

                setImportStats({ total, success: processed, skipped, errors: 0 });
                alert(`Import Complete!\nAdded: ${processed}\nSkipped (Duplicates): ${skipped}`);

            } catch (error) {
                console.error("Import Error:", error);
                alert("Error exploring file. Please check the format.");
                setImportStats({ total: 0, success: 0, skipped: 0, errors: 1 });
            } finally {
                setImporting(false);
                // Reset input
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            <div>
                <h2 className="text-3xl font-bold flex items-center gap-3">
                    <Database className="text-brand-red" /> Data Import & Export
                </h2>
                <p className="text-gray-400 mt-2">Manage your platform data in bulk. Export for backup or Import new content.</p>
            </div>

            {/* Import Section */}
            <div className="bg-[#141414] border border-brand-red/20 rounded-xl p-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Upload size={20} className="text-brand-red" /> Bulk Import Content
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">Upload an Excel file to add multiple movies or shows at once.</p>
                        <p className="text-xs text-gray-500 mt-2">
                            <button onClick={handleDownloadTemplate} className="underline hover:text-brand-red transition">
                                Download Template
                            </button> to ensure correct formatting.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {importing ? (
                            <div className="flex items-center gap-2 text-brand-red animate-pulse">
                                <Database size={18} /> Processing...
                            </div>
                        ) : (
                            <label className="cursor-pointer px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-bold flex items-center gap-2 transition hover:scale-105">
                                <Upload size={18} />
                                Select Excel File
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>
                </div>
                {/* Success Stats */}
                {importStats && (
                    <div className={`mt-4 p-3 rounded flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2 border ${importStats.errors > 0 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'
                        }`}>
                        {importStats.errors > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                        <span>
                            Processed {importStats.total} rows:
                            <span className="font-bold ml-1">{importStats.success} Added</span>,
                            <span className="font-bold ml-1 text-yellow-500">{importStats.skipped} Skipped (Duplicates)</span>.
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Full Backup Card */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-gradient-to-r from-brand-red/10 to-transparent border border-brand-red/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-brand-red rounded-lg text-white shadow-lg shadow-brand-red/20">
                            <Database size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Full Platform Backup</h3>
                            <p className="text-gray-400 text-sm">Export all content, users, and requests into a single multi-sheet Excel file.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExportAll}
                        className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-2 transition hover:scale-105 shadow-lg whitespace-nowrap"
                    >
                        <Download size={20} /> Export Everything
                    </button>
                </div>

                {/* Individual Export Cards */}
                <div className="bg-[#141414] border border-white/5 rounded-xl p-6 hover:border-white/10 transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <Film size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">{content.length} Items</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">Content Library</h3>
                    <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Export metadata for all movies, TV shows, and episodes.</p>
                    <button
                        onClick={handleExportContent}
                        className="w-full py-2 border border-white/10 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                    >
                        <FileSpreadsheet size={16} /> Export CSV
                    </button>
                </div>

                <div className="bg-[#141414] border border-white/5 rounded-xl p-6 hover:border-white/10 transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-500/10 text-green-500 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                            <Users size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">{users.length} Users</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">User Database</h3>
                    <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Export user profiles, subscription status, and activity stats.</p>
                    <button
                        onClick={handleExportUsers}
                        className="w-full py-2 border border-white/10 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                    >
                        <FileSpreadsheet size={16} /> Export CSV
                    </button>
                </div>

                <div className="bg-[#141414] border border-white/5 rounded-xl p-6 hover:border-white/10 transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-lg group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                            <MessageSquare size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase">{contentRequests.length} Requests</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">Content Requests</h3>
                    <p className="text-sm text-gray-500 mb-6 min-h-[40px]">Export user requests to track demand and fulfillment.</p>
                    <button
                        onClick={handleExportRequests}
                        className="w-full py-2 border border-white/10 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                    >
                        <FileSpreadsheet size={16} /> Export CSV
                    </button>
                </div>

            </div>

            <div className="mt-8 bg-[#111] border border-white/5 rounded-xl p-6">
                <h4 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4">Recent Exports</h4>
                <div className="text-center text-gray-600 text-sm py-8 border border-dashed border-white/5 rounded-lg">
                    Local export history is not tracked. Check your downloads folder.
                </div>
            </div>
        </div>
    );
};

export default ExportManager;
