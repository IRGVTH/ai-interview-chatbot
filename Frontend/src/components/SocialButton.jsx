import "./SocialButton.css";
import { FaFacebookF, FaGoogle } from "react-icons/fa";

function SocialButton({ text, type }) {
  return (
    <button className={`social ${type}`}>
      <div className="social-icon">
        {type === "facebook" ? <FaFacebookF /> : <FaGoogle />}
      </div>

      <span>{text}</span>
    </button>
  );
}

export default SocialButton;