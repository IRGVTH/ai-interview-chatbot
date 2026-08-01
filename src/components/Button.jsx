import "./Button.css";

function Button({
    text,
    variant="outline"
}){

    return(

        <button
                    onClick={onClick}
            className={`button ${variant}`}
        >

            {text}

        </button>

    )

}

export default Button;