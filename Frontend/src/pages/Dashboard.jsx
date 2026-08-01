import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Dashboard.css";


function Dashboard(){

    const navigate = useNavigate();

    const [job,setJob] = useState("");

    const startInterview = ()=>{

        if(job===""){
            alert("Please select job position");
            return;
        }


        navigate("/chat",{
            state:{
                position:job
            }
        });

    };


    return(

        <>

        <Navbar/>


        <div className="dashboard">


            <div className="welcome-card">

                <h1>
                    Welcome to AI Interview
                </h1>


                <p>
                    Practice your interview with AI
                    and improve your confidence.
                </p>


            </div>



            <div className="interview-card">


                <h2>
                    Select Job Position
                </h2>


                <select
                    value={job}
                    onChange={(e)=>setJob(e.target.value)}
                >

                    <option value="">
                        Choose position
                    </option>


                    <option>
                        Frontend Developer
                    </option>


                    <option>
                        Backend Developer
                    </option>


                    <option>
                        Data Analyst
                    </option>


                    <option>
                        UX/UI Designer
                    </option>


                </select>



                <button
                    className="start-btn"
                    onClick={startInterview}
                >

                    Start Interview

                </button>



            </div>


        </div>


        </>

    );

}


export default Dashboard;