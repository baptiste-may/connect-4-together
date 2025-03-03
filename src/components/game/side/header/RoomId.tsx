import {Eye, EyeClosed} from "lucide-react";
import {useState} from "react";
import {Button, Card} from "react-daisyui";

export default function Id({id}: {
    id: string;
}) {

    const [hideId, setHideId] = useState(true);

    return (
        <Card.Title>
            <div>
                <span>ID: </span>
                <span className={`${hideId ? "blur" : "blur-0"} transition-all`}>{id}</span>
            </div>
            <Button shape="square" color="neutral" size="sm"
                    onClick={() => setHideId(prev => !prev)}>
                {hideId ?
                    <Eye className="swap-on"/> :
                    <EyeClosed className="swap-off"/>
                }
            </Button>
        </Card.Title>
    );
}