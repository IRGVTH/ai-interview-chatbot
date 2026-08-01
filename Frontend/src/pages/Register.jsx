import { Link } from "react-router-dom";
import { useState } from "react";
import InputField from "../components/InputField";
import Button from "../components/Button";
import "./Register.css";

function Register() {

    const [username,setUsername]=useState("");
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");
    const [confirmPassword,setConfirmPassword]=useState("");

    const handleRegister=()=>{

        if(password!==confirmPassword){

            alert("รหัสผ่านไม่ตรงกัน");
            return;

        }

        console.log({
            username,
            email,
            password
        });

    }

    return(

        <div className="register-page">

            <div className="register-header">

                <h1>HR Talk</h1>

                <p>Create your account</p>

            </div>

            <div className="register-form">

                <InputField
                    label="Username"
                    type="text"
                    placeholder="กรอก Username"
                    value={username}
                    onChange={(e)=>setUsername(e.target.value)}
                />

                <InputField
                    label="Email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                />

                <InputField
                    label="Password"
                    type="password"
                    placeholder="กรอกรหัสผ่าน"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                />

                <InputField
                    label="Confirm Password"
                    type="password"
                    placeholder="ยืนยันรหัสผ่าน"
                    value={confirmPassword}
                    onChange={(e)=>setConfirmPassword(e.target.value)}
                />

                <Button
                    text="สมัครสมาชิก"
                    variant="green"
                    onClick={handleRegister}
                />

                <Link to="/">
                    <Button
                        text="กลับ"
                    />
                </Link>

            </div>

        </div>

    )

}

export default Register;