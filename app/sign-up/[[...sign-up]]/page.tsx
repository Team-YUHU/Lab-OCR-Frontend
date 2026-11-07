// import { SignUp } from "@clerk/nextjs";
// import { Suspense } from "react";

// export default function SignUpPage() {
//   return (
//     <div className="flex min-h-screen items-center justify-center">
//       <Suspense>
//         <SignUp />
//       </Suspense>
//     </div>
//   );
// }

// Clerk is disabled for now. To re-enable, restore the code above and remove this stub.
import { notFound } from 'next/navigation';

export default function SignUpPage() {
	notFound();
}
