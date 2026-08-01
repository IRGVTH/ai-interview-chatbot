import React from "react";
import {useLocation, useNavigate} from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Result.css";


function Result(){


    const location = useLocation();
    const navigate = useNavigate();


    const position =
    location.state?.position || "Frontend Developer";

React.useEffect(()=>{


    const oldHistory =
    JSON.parse(localStorage.getItem("history")) || [];



    const newResult = {

        id:Date.now(),

        position:position,

        score:85,

        date:new Date().toLocaleDateString()

    };



    localStorage.setItem(

        "history",

        JSON.stringify([
            ...oldHistory,
            newResult
        ])

    );


},[]);

    return(

    <>


    <Navbar/>


    <div className="result-page">



        <div className="result-header">


            <h1>
                Interview Result
            </h1>


            <p>
                Position : {position}
            </p>


        </div>





        <div className="score-card">


            <h2>
                Overall Score
            </h2>


            <div className="score">

                85%

            </div>


            <p>
                Excellent performance!
            </p>


        </div>






        <div className="detail-container">



            <div className="detail-card">


                <h3>
                    Communication
                </h3>


                <p>
                    90%
                </p>


            </div>





            <div className="detail-card">


                <h3>
                    Technical Skill
                </h3>


                <p>
                    82%
                </p>


            </div>





            <div className="detail-card">


                <h3>
                    Confidence
                </h3>


                <p>
                    85%
                </p>


            </div>




        </div>







        <div className="feedback-card">


            <h2>
                AI Feedback
            </h2>



            <h3>
                Strengths
            </h3>


            <ul>

                <li>
                    Good explanation skill
                </li>

                <li>
                    Strong understanding of concepts
                </li>

                <li>
                    Clear communication
                </li>

            </ul>






            <h3>
                Improvement
            </h3>


            <ul>

                <li>
                    Improve technical examples
                </li>

                <li>
                    Give more detailed answers
                </li>

            </ul>



        </div>







        <div className="result-buttons">


            <button

            onClick={()=>navigate("/dashboard")}

            >

            Back Dashboard

            </button>




            <button

            onClick={()=>navigate("/history")}

            >

            View History

            </button>



        </div>





    </div>



    </>

    );


}


export default Result;