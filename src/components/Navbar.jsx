import React from "react";
import { FiUser, FiLogOut } from "react-icons/fi";
import "./Navbar.css";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        AI Interview
      </div>

      <div className="nav-menu">
        <a href="/dashboard">Dashboard</a>
        <a href="/history">History</a>

        <div className="profile">
          <FiUser />
          <span>User</span>
        </div>

        <button className="logout">
          <FiLogOut />
          Logout
        </button>

      </div>

    </nav>
  );
}
const { logout } = useContext(AuthContext);

const navigate = useNavigate();

const handleLogout = () => {

    logout();

    navigate("/");

};
const handleLogout = () => {

    logout();

    navigate("/");

};
const handleLogout = () => {

    logout();

    navigate("/");

};
<button     className="logout"

onClick={handleLogout}>
    Logout
</button>
export default Navbar;