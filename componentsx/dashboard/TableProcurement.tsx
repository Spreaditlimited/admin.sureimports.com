'use client';

import { BookDown } from 'lucide-react';
import React, { useState } from 'react';
import AnimateHeight from 'react-animate-height';

const ComponentsAccordionsBasic = () => {
    const [active, setActive] = useState<string>('1');
    const togglePara = (value: string) => {
        setActive((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    return (

            <div className="mb-5">
                <div className="space-y-2 font-semibold">
                    <div className="rounded border border-[#d3d3d3] dark:border-[#1b2e4b]">
                        <button type="button" className={`flex w-full items-center p-4 text-white-dark dark:bg-[#1b2e4b] ${active === '1' ? '!text-primary' : ''}`} onClick={() => togglePara('1')}>
                            <b>#1 : </b> ORDER ID: 577333N23NN2HE8 
                            <div className={`ltr:ml-auto rtl:SSSSSSmr-auto ${active === '1' ? 'rotate-180' : ''}`}>
                            <BookDown />
                            </div>                                                                                  
                        </button>
                        <div>
                            <AnimateHeight duration={300} height={active === '1' ? 'auto' : 0}>
                                <div className="space-y-2 border-t border-[#d3d3d3] p-4 text-[13px] text-white-dark dark:border-[#1b2e4b]">
                                    <p>
                                        ...
                                    </p>
                                </div>
                            </AnimateHeight>
                        </div>
                    </div>
                    <div className="rounded border border-[#d3d3d3] dark:border-[#1b2e4b]">
                        <button type="button" className={`flex w-full items-center p-4 text-white-dark dark:bg-[#1b2e4b] ${active === '2' ? '!text-primary' : ''}`} onClick={() => togglePara('2')}>
                      <b>#2 : </b> ORDER ID: 2N23N333N23NN2HE8 
                            <div className={`ltr:ml-auto rtl:mr-auto ${active === '2' ? 'rotate-180' : ''}`}>
                            <BookDown />
                            </div>
                        </button>
                        <div>
                            <AnimateHeight duration={300} height={active === '2' ? 'auto' : 0}>
                                <div className="border-t border-[#d3d3d3] p-4 text-[13px] dark:border-[#1b2e4b]">
                                    ....
                                </div>
                            </AnimateHeight>
                        </div>
                    </div>
                    <div className="rounded border border-[#d3d3d3] dark:border-[#1b2e4b]">
                        <button type="button" className={`flex w-full items-center p-4 text-white-dark dark:bg-[#1b2e4b] ${active === '3' ? '!text-primary' : ''}`} onClick={() => togglePara('3')}>
                        <b>#3 : </b> ORDER ID: PB23N323F3UW32LD 
                            <div className={`ltr:ml-auto rtl:mr-auto ${active === '3' ? 'rotate-180' : ''}`}>
                            <BookDown />
                            </div>
                        </button>
                        <div>
                            <AnimateHeight duration={300} height={active === '3' ? 'auto' : 0}>
                                <div className="border-t border-[#d3d3d3] p-4 text-[13px] dark:border-[#1b2e4b]">
                                    <p>
                                        ORDER ID: PR73N333N23NN2HE8 
                                    </p>
                                    <button type="button" className="btn btn-primary mt-4">
                                        Accept
                                    </button>
                                </div>
                            </AnimateHeight>
                        </div>
                    </div>
                </div>
            </div>

    );
};

export default ComponentsAccordionsBasic;
