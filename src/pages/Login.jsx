import { Link } from "react-router-dom";
import InputField from "../components/InputField";
import Button from "../components/Button";
import SocialButton from "../components/SocialButton";
import "./Login.css";
import api from "../services/api";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";


function Login() {

  const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {

        e.preventDefault();

        if (!email || !password) {
            setError("Please enter your email and password.");
            return;
        }

        try {

            // ถ้ายังไม่มี Backend จริง ไม่ต้องเรียก API
            login(email);

            navigate("/dashboard");

        } catch (err) {

            setError("Login Failed");

        }

    };

  return (
    <div className="login-page">

      <div className="login-header">
        <h2>Welcome to</h2>
        <h1>HR Talk</h1>
      </div>

      <div className="login-form">

        <InputField
          label="Email"
          type="email"
          placeholder="กรอก Email"
           value={email}
    onChange={(e) => setEmail(e.target.value)}
        />

        <InputField
          label="Password"
          type="password"
          placeholder="กรอกรหัสผ่าน"
          value={password}
    onChange={(e) => setPassword(e.target.value)}
        />


        {
    error && (
        <p className="error">
            {error}
        </p>
    )
}
      
        <Button text="เข้าสู่ระบบ"
            onClick={handleLogin}

         />

        <p className="divider">
          หรือ เข้าสู่ระบบผ่าน
        </p>

        <SocialButton
          type="facebook"
          text="เข้าสู่ระบบด้วย Facebook"
        />

        <SocialButton
          type="google"
          text="เข้าสู่ระบบด้วย Google"
        />

        <input
    type="email"
        placeholder="Email"
    value={email}
    onChange={(e)=>setEmail(e.target.value)}
/>

<input
    type="password"
    placeholder="Password"
    value={password}
    onChange={(e)=>setPassword(e.target.value)}
/>

        <p className="register-text">
          ยังไม่มีบัญชีสมัครสมาชิกเลย
        </p>

        <Link to="/register">
          <Button
            text="สมัครสมาชิก"
            variant="green"
          />
        </Link>

      </div>

    </div>
  );
}

export default Login;