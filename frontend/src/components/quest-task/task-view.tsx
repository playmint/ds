import { FunctionComponent, useEffect } from 'react';
import { TaskItemProps } from './task-item';

const tickSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
        <path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z" />
    </svg>
);

export const TaskView: FunctionComponent<
    {
        isCompleted: boolean;
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>
> = ({ isCompleted, task, setTaskCompletion }) => {
    const taskId = task.node.id;
    useEffect(() => {
        setTaskCompletion((oldObj) => {
            const newObj = oldObj ? { ...oldObj } : {};
            newObj[taskId] = isCompleted;
            return newObj;
        });
    }, [taskId, isCompleted, setTaskCompletion]);

    return (
        <div className="taskItem">
            <div className="tickBox">{isCompleted && tickSvg}</div>
            <p>{task.node.name?.value}</p>
        </div>
    );
};
