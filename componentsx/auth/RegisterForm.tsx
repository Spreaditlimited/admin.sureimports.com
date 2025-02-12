'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import IconUser from '@/components/icon/icon-user';
import React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Alert from '@/componentsx/Alert';

//USER DATA 
interface User {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
}

//API RESPONSE 
interface ApiResponse {
    messagex: any;
    statusx: string;
    successx: boolean;
    userx: User;
    // Add other properties as needed
  }



const RegisterForm = () => {

    
                //SET VALUES AND STATE
                const router = useRouter();
                const [firstname, setFirstname] = useState('');
                const [lastname, setLastname] = useState('');
                const [email, setEmail] = useState('');
                const [password, setPassword] = useState('');
                const [password2, setPassword2] = useState('');
                const { login } = useAuth();
    
                
                //-----------------------------------------------------------------//
                //STATE VARAIBLES
                const [error, setError] = useState<string | null>(null);
                const [isLoading, setIsLoading] = useState(false);
                const [messagex, setMessagex] = useState<any>('');
    
                //alert state variables
                const [showAlert, setShowAlert] = useState(false);
                const [alertMessage, setAlertMessage] = useState('');
                const [alertType, setAlertType] = useState<'success' | 'error'>('success');
    
                //HIDE ALERT AFTER 5 SECONDS
                useEffect(() => {
                    let timer: NodeJS.Timeout;
                    if (showAlert) {
                    timer = setTimeout(() => {
                        setShowAlert(false);
                    }, 5000); // Hide alert after 5 seconds
                    }
                    return () => {
                    if (timer) clearTimeout(timer);
                    };
                }, [showAlert]);
                //-----------------------------------------------------------------//
    
    
                //HANDLE FORM SUBMISSION
                const submitForm = async (e: React.FormEvent) => {
                    e.preventDefault();
                    setError(null);
                    setIsLoading(true);
            
                    //MAKE REQUEST ATTEMPT
                    try {
                    //MAKE REQUEST
                            const res = await fetch('/api/auth/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ firstname, lastname, email, password, password2 }),
                    });
                    const data: ApiResponse = await res.json();
                    if (data.successx) {router.push('/success/registration');}
    
    
                    //GET RESPONSE DATA AND UPDATE MESSAGE STATUS
                    setMessagex(data.messagex.message1);
    
                    //alert popup update
                    setAlertMessage(data.messagex.message1);
                    setAlertType('success');
                    //setAlertType('error');
                    setShowAlert(true);
    
                    //alert popup 2
                    toast.success(data.messagex.message1);
                    //toast.error(data.messagex.message1);
    
            } catch (error: any) {
              setError(error.message);
            } finally {
              setIsLoading(false);
            }
        }


    /////////////////////// UI/UX //////////////////////
    return (
        <main>
        <div>
        <div className="absolute inset-0">
            <img src="/assets/images/auth/bg-gradient.png" alt="image" className="h-full w-full object-cover" />
        </div>
        <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
            <img src="/assets/images/auth/coming-soon-object1.png" alt="image" className="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2" />
            <img src="/assets/images/auth/coming-soon-object2.png" alt="image" className="absolute left-24 top-0 h-40 md:left-[30%]" />
            <img src="/assets/images/auth/coming-soon-object3.png" alt="image" className="absolute right-0 top-0 h-[300px]" />
            <img src="/assets/images/auth/polygon-object.svg" alt="image" className="absolute bottom-0 end-[28%]" />
            <div className="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 lg:min-h-[758px] lg:flex-row lg:gap-10 xl:gap-0">
                <div className="relative hidden w-full items-center justify-center bg-[linear-gradient(225deg,rgba(239,18,98,1)_0%,rgba(67,97,238,1)_100%)] p-5 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]">
                    <div className="absolute inset-y-0 w-8 from-primary/10 via-transparent to-transparent ltr:-right-10 ltr:bg-gradient-to-r rtl:-left-10 rtl:bg-gradient-to-l xl:w-16 ltr:xl:-right-20 rtl:xl:-left-20"></div>
                    <div className="ltr:xl:-skew-x-[14deg] rtl:xl:skew-x-[14deg]">
                        <Link href="/" className="ms-10 block w-20 lg:w-40">
                            <img src="/assets/images/logos/logoz.png" alt="Logo" className="w-full" />
                        </Link>
                        <div className="mt-24 hidden w-full max-w-[430px] lg:block">
                            <img src="/assets/images/auth/register.svg" alt="Cover Image" className="w-full" />
                        </div>
                    </div>
                </div>
                <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                    <div className="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                        <Link href="/" className="block w-8 lg:hidden">
                            <img src="/assets/images/logo.svg" alt="Logo" className="mx-auto w-10" />
                        </Link>
                        {/* <LanguageDropdown className="ms-auto w-max" /> */}
                    </div>
                    <div className="w-full max-w-[440px] lg:mt-16">
                        <div className="mb-10">
                            <h1 className="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">Sign Up</h1>
                            <p className="text-base font-bold leading-normal text-white-dark">Enter your email and password to register</p>
                        </div>


        {/* ///////////////////////////// REGISTRATION FORM STARTS HERE ///////////////////////// */}
        <form className="space-y-5 dark:text-white" onSubmit={submitForm}>


            <div>
                <label htmlFor="Name">First Name</label>
                <div className="relative text-white-dark">
                    <input
                        id="firstname"
                        type="text"
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        placeholder="Enter Firstname"
                        className="form-input ps-10 placeholder:text-white-dark"
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconUser fill={true} />
                    </span>
                </div>
            </div>


            <div>
                <label htmlFor="Name">Last Name</label>
                <div className="relative text-white-dark">
                    <input
                        id="lastname"
                        type="text"
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        placeholder="Enter Firstname"
                        className="form-input ps-10 placeholder:text-white-dark"
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconUser fill={true} />
                    </span>
                </div>
            </div>


            <div>
                <label htmlFor="Email">Email</label>
                <div className="relative text-white-dark">
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter Email"
                        className="form-input ps-10 placeholder:text-white-dark"
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>


            <div>
                <label htmlFor="Password">Password</label>
                <div className="relative text-white-dark">
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password"
                        className="form-input ps-10 placeholder:text-white-dark"
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>


            <div>
                <label htmlFor="Password">Confirm Password</label>
                <div className="relative text-white-dark">
                    <input
                        id="password2"
                        type="password"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        placeholder="Confirm Password"
                        className="form-input ps-10 placeholder:text-white-dark"
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>


            <div>
                <label className="flex cursor-pointer items-center">
                    <input type="checkbox" className="form-checkbox bg-white dark:bg-black" required/>
                    <span className="text-white-dark">Confirm your action</span>
                </label>
            </div>


            {/* GENERAL ERROR REPORTING */}
            {
                messagex && (<div className='text-xs' style={{ color: 'red' }}><b>Alert!: &nbsp;</b> {messagex}</div>)
            }


            {/* SUBMIT BUTTON */}
            <button type="submit" disabled={isLoading} className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                {isLoading ? 'Connecting...' : 'Sign Up'}
            </button>

            {/* ERROR REPORTING FOR POP-UP */}
            {/* {showAlert && (
                <div className="mt-4">
                <Alert
                    message={alertMessage}
                    type={alertType}
                    onClose={() => setShowAlert(false)}
                />
                </div>
            )} */}


        </form>
        {/* ///////////////////////////// REGISTRATION FORM STARTS HERE ///////////////////////// */}



        <div className="relative my-7 text-center md:mb-9">
                                <span className="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 bg-white-light dark:bg-white-dark"></span>
                                <span className="relative bg-white px-2 font-bold uppercase text-white-dark dark:bg-dark dark:text-white-light">or</span>
                            </div>

                            <div className="text-center dark:text-white">
                                Already have an account ?&nbsp;
                                <Link href="/auth/login" className="uppercase text-primary underline transition hover:text-black dark:hover:text-white">
                                    SIGN IN
                                </Link>
                            </div>
                        </div>
                        <p className="absolute bottom-6 w-full text-center dark:text-white">© {new Date().getFullYear()}. {process.env.COMPANY_NAME} All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>



</main>

    );
};

//end



export default RegisterForm;
