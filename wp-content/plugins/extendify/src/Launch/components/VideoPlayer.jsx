import { useRef, useState } from 'react';

export const VideoPlayer = ({ path, poster, className = null }) => {
	const videoRef = useRef();
	const [playing, setPlaying] = useState(false);
	return (
		<div
			className={`relative ${className}`}
			style={{
				backgroundImage: !playing ? `url(${poster})` : 'none',
				backgroundSize: 'contain',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
			}}
		>
			<video
				ref={videoRef}
				id="video-player"
				className="h-auto max-h-[min(50vh,400px)] w-full object-contain"
				playsInline
				muted
				autoPlay
				poster={poster}
				loop
				onPlay={() => setPlaying(true)}
			>
				<source src={path} type="video/webm" />
				Your browser does not support the video tag.
			</video>
		</div>
	);
};
