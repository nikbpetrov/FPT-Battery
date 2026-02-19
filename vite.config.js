import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.js'),
			name: 'initFPTBattery',
			fileName: (format) => `fpt-battery.${format}.js`,
			formats: ['umd', 'es'],
		},
		sourcemap: true,
		rollupOptions: {
			output: {
				assetFileNames: (assetInfo) => {
					if (assetInfo.name === 'style.css') {
						return 'fpt-battery.css';
					}
					return 'assets/[name]-[hash][extname]';
				},
			},
		},
	},
	plugins: [],
	publicDir: false,
	server: {
		port: 3001,
	},
	preview: {
		port: 3001,
	},
});
