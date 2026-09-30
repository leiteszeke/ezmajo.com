import { customComponents } from '@agent/lib/markdown';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export const AnimateChunks = ({ words, delay = 0.4, duration = 0.25 }) => {
	const isChars = words.every((word) => word.length === 1);

	return (
		<AnimatePresence>
			{words.map((word, i) => (
				<motion.span
					key={i}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0 }}
					transition={{ duration, delay: i * delay }}
				>
					{isChars ? (
						word
					) : (
						<ReactMarkdown components={customComponents}>{word}</ReactMarkdown>
					)}
				</motion.span>
			))}
		</AnimatePresence>
	);
};
