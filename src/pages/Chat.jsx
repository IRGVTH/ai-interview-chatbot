import React, {useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Chat.css";


function Chat(){

    const location = useLocation();
    const navigate = useNavigate();


    const position = location.state?.position || "Frontend Developer";


    const [message,setMessage] = useState("");



    const [chat,setChat] = useState([

        {
            sender:"AI",
            text:`Welcome! Let's start your ${position} interview. 
            Please introduce yourself.`
        }

    ]);




    const sendMessage = ()=>{


        if(message.trim()==="")
            return;



        setChat([

            ...chat,

            {
                sender:"User",
                text:message
            },


            {
                sender:"AI",
                text:"Good answer. Can you explain more about your experience?"
            }


        ]);



        setMessage("");

    };




    const finishInterview=()=>{


        navigate("/result",{

            state:{
                position:position,
                chat:chat
            }

        });


    };




return(

<>


<Navbar/>


<div className="chat-page">


    <div className="interview-header">

        <h2>
            AI Interview
        </h2>


        <p>
            Position : {position}
        </p>


    </div>




    <div className="chat-box">


        {

        chat.map((item,index)=>(


            <div
            key={index}
            className={
                item.sender==="AI"
                ?
                "message ai"
                :
                "message user"
            }
            >


                <b>
                    {item.sender}
                </b>


                <p>
                    {item.text}
                </p>



            </div>


        ))

        }


    </div>





    <div className="input-area">


        <input

        value={message}

        onChange={(e)=>setMessage(e.target.value)}

        placeholder="Type your answer..."

        />


        <button
        onClick={sendMessage}
        >

        Send

        </button>



    </div>





    <button

    className="finish-btn"

    onClick={finishInterview}

    >

    Finish Interview

    </button>




</div>


</>

);


}


export default Chat;