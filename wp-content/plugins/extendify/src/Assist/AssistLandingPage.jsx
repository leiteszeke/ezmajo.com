import { Modal } from '@assist/components/Modal';
import '@assist/documentation.css';
import { useRouter } from '@assist/hooks/useRouter';
import { Header } from '@assist/pages/parts/Header';

export const AssistLandingPage = () => {
	const { CurrentPage } = useRouter();

	return (
		<>
			<Header />
			<CurrentPage />
			<Modal />
		</>
	);
};
