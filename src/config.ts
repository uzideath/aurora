const config: ConfigType = {
	bot: {
		owners: [],
		prefix: process.env.PREFIX ? process.env.PREFIX.split(',') : ['.'],
	},
};

interface Conf {
	bot: {
		prefix: string[];
		owners: [];
	};
}

type ConfigType = Conf;

export default config;
