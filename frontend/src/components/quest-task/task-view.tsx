import { FunctionComponent } from 'react';
import styled, { css } from 'styled-components';
import { colors } from '@app/styles/colors';
import { QuestTaskFragment } from '@downstream/core/src/gql/graphql';

const tickSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
        <path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z" />
    </svg>
);

const StyledTaskView = styled.div`
    ${({ isCompleted }: { isCompleted: boolean }) => css`
        display: flex;
        align-items: center;
        margin-bottom: 1rem;

        > .tickBox {
            flex-shrink: 0;
            margin-right: 1rem;
            background: ${isCompleted ? colors.green_0 : colors.grey_0};
            width: 3rem;
            height: 3rem;
            border: 2px solid ${isCompleted ? colors.green_1 : colors.grey_2};
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        > svg {
            width: 1.7rem;
            height: 1.7rem;
            fill: ${colors.grey_5};
        }

        > p {
            font-weight: 800;
            ${isCompleted &&
            `
                text-decoration: line-through;
                color: ${colors.grey_2};
            `}
        }
    `}
`;

export const TaskView: FunctionComponent<{
    task: QuestTaskFragment;
    isCompleted: boolean;
}> = ({ isCompleted, task }) => {
    return (
        <StyledTaskView isCompleted={isCompleted}>
            <div className="tickBox">{isCompleted && tickSvg}</div>
            <p>{task.name?.value}</p>
        </StyledTaskView>
    );
};
