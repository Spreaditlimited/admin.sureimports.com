// import { cookies } from "next/headers";
// import { revalidatePath } from "next/cache";
// import { redirect } from "next/navigation";

// export default function userData() {

//     const isLoggedIn_auth = cookies().get("Authorization");
//     const isLoggedIn_user = cookies().get("UserData");

//     if(isLoggedIn_auth && isLoggedIn_user){
//     //USER DATA
//     const userData = cookies().get("UserData");
//     const datax:any = userData?.value;
//     const getUser = JSON.parse(datax);
//     return getUser;
// }else{  

//     //delete cookies
//     cookies().delete('Authorization');
//     cookies().delete('UserData');

//     //redirect to login
//     revalidatePath("../login"); 
//     redirect("../login"); 

//     //stop all preceeding instructions
//     process.exit(); 
// }

//console.log('GOD IS GOOD AND GREATE!:::'+getUser.userEmail);

//}



import { cookies } from 'next/headers';

export default async function userData() {
  const cookieStore = await cookies(); // Await the resolved ReadonlyRequestCookies object.

  const isLoggedIn_auth = cookieStore.get("Authorization");
  const isLoggedIn_user = cookieStore.get("UserData");

  if (isLoggedIn_auth && isLoggedIn_user) {
    return {
      auth: isLoggedIn_auth.value,
      user: isLoggedIn_user.value,
    };
  }

  return null;
}