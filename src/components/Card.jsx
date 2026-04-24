import React from 'react';

export default function Card({ children, className = "" }) {
    return (
        <div className={`bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl p-4 md:p-6 shadow-xl ${className}`}>
            {children}
        </div>
    );
}
