'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import { RxDashboard } from 'react-icons/rx';
import StatisticsBox from './StatisticsBox';
import StatisticsBox2 from './StatisticsBox2';
import CounterBox from './CounterBoxProcurement';


export const metadata: Metadata = {
    title: 'Dashboard',
};


const Page = () => {

            const { user, logout } = useAuth();
            const router = useRouter();
        
            //CHECK IF USER IS LOGGED IN OR NOT
            useEffect(() => {
            if (!user) {router.push('../auth/login');}
                            }, [user, router]);
            if (!user) {return null;}

            //LOGOUT 
            const Logoutx = async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                logout();
            };
  

    return (
        <div>

            <div className="space-y-8 pt-5">
                <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-dark pb-7">
                    <span className='text-xl'><b>Dashboard</b></span>
                </div>
                <div className="custom-select gridx grid-cols-1x gap-6 lg:grid-cols-2 mt-8">
                    {/* Basic */}
                    {/* <ComponentsFormsSelectBasic /> */}
                    
                    <StatisticsBox />
                    <StatisticsBox2 />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
