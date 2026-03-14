import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            pages.push(
                <button key={1} onClick={() => onPageChange(1)} className="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all bg-white/5 hover:bg-white/20 text-gray-300">
                    1
                </button>
            );
            if (startPage > 2) {
                pages.push(<div key="dots1" className="w-10 h-10 flex items-center justify-center text-gray-500"><MoreHorizontal size={16} /></div>);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentPage === i
                            ? 'bg-brand-red text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] scale-110'
                            : 'bg-white/5 hover:bg-white/20 text-gray-300 hover:text-white'
                        }`}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<div key="dots2" className="w-10 h-10 flex items-center justify-center text-gray-500"><MoreHorizontal size={16} /></div>);
            }
            pages.push(
                <button key={totalPages} onClick={() => onPageChange(totalPages)} className="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all bg-white/5 hover:bg-white/20 text-gray-300">
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-2 mt-12 mb-16 animate-in fade-in">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors"
                aria-label="Previous Page"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
                {renderPageNumbers()}
            </div>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors"
                aria-label="Next Page"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default Pagination;
