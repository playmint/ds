/** @format */

import { createContext, ReactNode, useContext, useReducer, useRef } from 'react';
import { Modal } from '@app/components/molecules/modal';
import { useFocusTrap } from '@app/hooks/use-focus-trap';
import { useScrollLock } from '@app/hooks/use-scroll-lock';

export interface ModalContextProviderProps {
    children?: ReactNode;
}

export interface ModalContextStore {
    openModal: (closable?: boolean) => void;
    closeModal: () => void;
    setModalContent: (content: ReactNode) => void;
}

export const ModalContext = createContext<ModalContextStore>({} as ModalContextStore);

export const useModalContext = () => useContext(ModalContext);

export const ModalProvider = ({ children }: ModalContextProviderProps) => {
    const contentRef = useRef<ReactNode>(null);
    const containerRef = useFocusTrap<HTMLDivElement>(null);
    const { lockScroll, unlockScroll } = useScrollLock();

    interface ModalState {
        isVisible: boolean;
        closable: boolean;
    }

    function reducer(state: ModalState, action: (state: ModalState) => ModalState) {
        return action(state);
    }

    const [{ isVisible, closable }, update] = useReducer(reducer, {
        isVisible: false,
        closable: true
    });

    function openModal(closable: boolean = true) {
        lockScroll();
        update(() => ({
            isVisible: true,
            closable: closable
        }));
    }

    function closeModal() {
        unlockScroll();
        update(() => ({
            isVisible: false,
            closable: closable
        }));
    }

    function setModalContent(content: ReactNode) {
        contentRef.current = content;
    }

    const store: ModalContextStore = {
        openModal,
        closeModal,
        setModalContent
    };

    return (
        <ModalContext.Provider value={store}>
            {children}
            {isVisible && (
                <Modal ref={containerRef} closable={closable}>
                    {contentRef.current}
                </Modal>
            )}
        </ModalContext.Provider>
    );
};
