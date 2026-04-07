"use client";

import { signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const params = useParams();
  const tenant = params?.tenant as string;
  const router = useRouter();

  console.log("LOGIN PAGE params =", params);
  console.log("LOGIN PAGE tenant =", tenant);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    console.log("SIGNIN tenant =", tenant);

    const res = await signIn("credentials", {
      email,
      password,
      tenant,
      redirect: false,
    });

    console.log("login result =", res);

    if (res?.ok) {
      router.push(`/${tenant}/admin/orders`);
      return;
    }

    alert(JSON.stringify(res));
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded">
      <h2 className="text-xl font-bold mb-4">Admin Login ({tenant})</h2>

      <input
        placeholder="Email"
        className="w-full mb-3 p-2 border"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full mb-3 p-2 border"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        className="w-full bg-orange-600 text-white p-2 rounded"
      >
        Login
      </button>
    </div>
  );
}