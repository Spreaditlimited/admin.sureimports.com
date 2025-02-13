'use server'
 
// import { cookies } from 'next/headers'
 
// export async function logout() {
//   console.log('Logging out...');
//   cookies().delete('Authorization');
//   cookies().delete('UserData');
// }


import { headers } from 'next/headers';

export async function logout() {
  console.log('Logging out...');
  
  const headersInstance = headers();
  
  // Set cookies to expire
   (await headersInstance).append('Set-Cookie', 'Authorization=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly;');
  (await headersInstance).append('Set-Cookie', 'UserData=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly;');
}