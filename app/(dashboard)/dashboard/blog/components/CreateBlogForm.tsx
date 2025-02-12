'use client'

import Products from '@/componentsx/dashboard/Products';
import { Metadata } from 'next';
import React, { useRef } from 'react';
import { useState } from 'react';
import { MdAddShoppingCart, MdAddToPhotos, MdBook } from 'react-icons/md';
//import ReactQuill from 'react-quill';
//import 'react-quill/dist/quill.snow.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
//import toast from 'react-hot-toast';
import { useAlert } from '@/app/context/AlertContext';
import Image from 'next/image';
import ImageUploadBox from '@/componentsx/ImageUploadBox';
import ImageBox from '@/componentsx/ImageBox';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import axios from 'axios';
import Editor from '@/componentsx/Editor/Editor';
// import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css';




export const metadata: Metadata = {
    title: 'Printin Admin Dashboard',
    description: 'Printin'
};

//USER DATA
interface User {
    pidUser: string;
    email: string;
    name: string;
  }
  
//API RESPONSE
interface ApiResponse {
    responsex: any;
    successx: boolean;
    userx: User;
  }

interface ProductFormProps {
    product?: {
      id: number
      pidProduct: string
      pidCategory: string
      productName: string
      productDescription: number
      productCategory: string
      productPrice: number
      productPriceInfo: string
      productGeneralInfo: string
      productMOQ: number
      productVAT: number
      productAdditionalPrice: number
      productAdditionalDescription: string
    }
  }



const Page = () => {

    const [value, setValue] = useState('');

    //initialize alert system
    const navigateWithAlert = useNavigationWithAlert();

    //SET VARIABLES DATA
    const router = useRouter();
    //const [value, setValue] = useState('<h3>Product Description Title</h3><br /><p> Product description goes here...</p>');
    const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false);


    const handleImageChange = (file: File) => {
      setFile(file);
    };

    const editorRef = useRef(null);
    const log = () => {
      if (editorRef.current) {
        //console.log(editorRef.current.getContent() as any);
      }
    };

    //SET FORM DATA
    let categoryID = 'CAT' + new Date().getTime().toString();
    const [pidPost, setPidPost] = useState(categoryID);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    //const [categoryImage, setCategoryImage] = useState('');



    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                setIsLoading(true);

                if (!file) {toast.error('Pleae add a Post Featured Image'); setIsLoading(false); return;}else{}

                //collecting form data
                const formData = new FormData();
                formData.append('file', file);
                formData.append('pidPost', pidPost);
                formData.append('title', title);
                formData.append('category', category);
                formData.append('content', content);
                formData.append('tags', tags);
                //formData.append('categoryImage', categoryImage);

                //MAKE REQUEST ATTEMPT
                try {
                    //MAKE REQUEST
                            const res = await fetch('/api/crud/posts/create', {
                            method: 'POST',
                            //headers: { 'Content-Type': 'application/json' },
                            //headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            //headers: { 'Content-Type': 'multipart/form-data' },
                            body: formData,
                    });


                    //PROCESS POST RESPONSE
                    const data: ApiResponse = await res.json();
                    //if (data.responsex.status == 'SUCCESS'){toast.success(data.responsex.message);}
                    if (data.responsex.status == 'SUCCESS'){navigateWithAlert('/dashboard/category', 'success', 'Action was successfully!');}
                    if (data.responsex.status == 'NO_IMAGE_SELECTED'){toast.warning(data.responsex.message);}
                    if (data.responsex.status == 'INVALID_IMAGE_UPLOAD'){toast.warning(data.responsex.message);}
                    if (data.responsex.status == 'IMAGE_UPLOAD_FAILED'){toast.warning(data.responsex.message);}
                    if (data.responsex.status == 'ACTION_FAILED'){toast.error(data.responsex.message);}

                    // if (data.responsex.status == 'NO_IMAGE') {
                    //     toast.info(data.responsex.message);
                    //     //navigateWithAlert('/dashboard', 'success', 'Action was successfully!')
                    //     // setMessage(data.responsex.message);
                    //     // setLoading(false);
                    //     //await new Promise((resolve) => setTimeout(resolve, 5000));
                    //     //router.push('/auth/login');
                    // }


            } catch (error: any) {
                toast.error(error.message);
                //navigateWithAlert('/dashboard', 'success', 'Action was successfully!')
            } finally {
                setIsLoading(false);
            }
    }
//END FORM...



    return (
            <main>


<div className="space-y-8 pt-5">
        <div className="pt-10 pl-20 panel flex items-center overflow-x-auto whitespace-nowrap p-28 text-dark">



{/* -------------------------- PRODUCT FORM -------------------------- */}
<form className="space-y-5" onSubmit={handleSubmit} >




{/* TITLE */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
            <label htmlFor="productName"><b> Post Title</b></label>
            <input 
                  id="title" 
                  name='title' 
                  type="text" 
                  placeholder="Enter Post Title here" 
                  className="form-input" 
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
        </div>
    </div>





    {/* POST CATEGORY */}
    <div>
        <label htmlFor="gridAddress1"><b>Post Category</b></label>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            
            <div className="md:col-span-2">
                <select 
                    className="form-select text-white-dark" 
                    id='category' 
                    name='category'
                    value={category} 
                    onChange={(e:any) => setCategory(e.target.value)}
                    required>
                        <option> - Select - </option>
                            {/* {
                                categoryALL.map(
                                    (datax: any, index) => {
                                        return(<><option value={datax.pidCategory}>{datax.categoryName}</option></>)
                                    }
                                )
                            } */}
                        <option value={'GENERAL'}>General</option>
                        <option value={'BUSINESS'}>Business</option>
                        <option value={'EDUCATION'}>Education</option>
                        <option value={'POLITICS'}>Politics</option>
                        <option value={'TECHNOLOGY'}>Technology</option>
                        <option value={'AFRICA'}>Africa</option>
                        <option value={'WORLD'}> World</option>
                </select>
            </div>

            <div>
                <button type="button" onClick={() => {router.push('/dashboard/blog/category/create');}} className="btn btn-dark w-full"><MdAddToPhotos /> &nbsp; Add New Category</button>
            </div>

        </div>
    </div>




{/* CONTENT */}
    <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
        <label htmlFor="productDescription"><b>Content</b></label>        
            <div className="flex">
                <textarea 
                    id="content"  
                    name='content' 
                    rows={7} 
                    className="form-textarea" 
                    placeholder="Provide post content here"
                    onChange={(e) => setContent(e.target.value)}
                    >
                </textarea>
            </div>
    </div>




{/*  SEO TAGS  */}
<div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
        <label htmlFor="productDescription"><b>SEO Tags</b></label>        
            <div className="flex">
                <textarea 
                    id="tags"  
                    name='tags' 
                    rows={4} 
                    className="form-textarea" 
                    placeholder="Provide SEO Tags here"
                    onChange={(e) => setTags(e.target.value)}
                    >
                </textarea>
        </div>
</div>




{/* IMAGE UPLOAD */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
        <label htmlFor="url"><b>Upload Featured Image</b></label>
        <div className="flex">
                <ImageBox onImageChange={handleImageChange} />
        </div>
    </div>
</div>



<br/>




{/* POST BLOG */}
    <button type="submit" className="btn btn-dark !mt-6" disabled={isLoading}>
        <MdBook /> &nbsp; {isLoading ? 'Adding Category...' : 'Post Content'} 
    </button>

    


</form>
{/* ----------------------FORM ENDS---------------------- */}




</div>
</div>


</main>
    );
};

export default Page;