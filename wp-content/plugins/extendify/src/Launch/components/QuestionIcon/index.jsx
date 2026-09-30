import { Block } from '@launch/components/QuestionIcon/Icons/block';
import { Booking } from '@launch/components/QuestionIcon/Icons/booking';
import { Distance } from '@launch/components/QuestionIcon/Icons/distance';
import { Donation } from '@launch/components/QuestionIcon/Icons/donation';
import { Events } from '@launch/components/QuestionIcon/Icons/events';
import { ExternalLink } from '@launch/components/QuestionIcon/Icons/external-link';
import { Language } from '@launch/components/QuestionIcon/Icons/language';
import { LongPage } from '@launch/components/QuestionIcon/Icons/long-page';
import { Newsmode } from '@launch/components/QuestionIcon/Icons/newsmode';
import { Pages } from '@launch/components/QuestionIcon/Icons/pages';
import { Phone } from '@launch/components/QuestionIcon/Icons/phone';
import { ShoppingCart } from '@launch/components/QuestionIcon/Icons/shopping-cart';
import { Storefront } from '@launch/components/QuestionIcon/Icons/storefront';

const ICONS_MAP = {
	'long-page': LongPage,
	block: Block,
	pages: Pages,
	'external-link': ExternalLink,
	phone: Phone,
	'shopping-cart': ShoppingCart,
	storefront: Storefront,
	booking: Booking,
	events: Events,
	donation: Donation,
	newsmode: Newsmode,
	distance: Distance,
	language: Language,
};

export const Icon = ({ id }) => {
	const IconComponent = ICONS_MAP?.[id];
	return IconComponent ? <IconComponent /> : null;
};
