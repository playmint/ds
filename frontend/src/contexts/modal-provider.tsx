/** @format */

import { createContext, ReactNode, useContext, useReducer, useRef } from 'react';
import { Modal } from '@app/components/molecules/modal';
import { useFocusTrap } from '@app/hooks/use-focus-trap';
import { useScrollLock } from '@app/hooks/use-scroll-lock';

export interface ModalContextProviderProps {
    children?: ReactNode;
}

export interface ModalOptions {
    closable: boolean;
    showCloseButton: boolean;
}

export interface ModalContextStore {
    openModal: (options?: ModalOptions) => void;
    closeModal: () => void;
    setModalContent: (content: ReactNode) => void;
}

export const ModalContext = createContext<ModalContextStore>({} as ModalContextStore);

export const useModalContext = () => useContext(ModalContext);

export const ModalProvider = ({ children }: ModalContextProviderProps) => {
    const contentRef = useRef<ReactNode>(null);
    const containerRef = useFocusTrap<HTMLDivElement>(null);
    const { lockScroll, unlockScroll } = useScrollLock();

    interface ModalState extends ModalOptions {
        isVisible: boolean;
    }

    function reducer(state: ModalState, action: (state: ModalState) => ModalState) {
        return action(state);
    }

    const [{ isVisible, closable, showCloseButton }, update] = useReducer(reducer, {
        isVisible: false,
        closable: true,
        showCloseButton: true
    });

    function openModal(options?: ModalOptions) {
        lockScroll();
        update(() => ({
            isVisible: true,
            closable: options?.closable ?? true,
            showCloseButton: options?.showCloseButton ?? true
        }));
    }

    function closeModal() {
        unlockScroll();
        update(() => ({
            isVisible: false,
            closable,
            showCloseButton
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
                <Modal ref={containerRef} closable={closable} showCloseButton={showCloseButton}>
                    {contentRef.current}
                </Modal>
            )}
        </ModalContext.Provider>
    );
};
