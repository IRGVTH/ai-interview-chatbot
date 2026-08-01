import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import Navbar from "../components/Navbar";
import "./History.css";


function History(){


    const [history,setHistory] = useState([]);

    const navigate = useNavigate();



    useEffect(()=>{


        const data = 
        JSON.parse(
            localStorage.getItem("history")
        ) || [];


        setHistory(data);


    },[]);





    return(

    <>


    <Navbar/>



    <div className="history-page">



        <h1>
            Interview History
        </h1>




        {

        history.length === 0 ?

        (

            <div className="empty">

                No interview history

            </div>

        )


        :


        history.map((item)=>(


            <div 
            className="history-card"
            key={item.id}
            >



                <div>


                    <h2>
                        {item.position}
                    </h2>


                    <p>
                        Date : {item.date}
                    </p>


                </div>





                <div className="history-score">


                    <h2>
                        {item.score}%
                    </h2>



                </div>





                <button

                onClick={()=>navigate("/result",{

                    state:{
                        position:item.position
                    }

                })}


                >

                View Result

                </button>




            </div>


        ))

        }





    </div>


    </>

    );


}


export default History;