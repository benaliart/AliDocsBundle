<?php

namespace Aliarteo\AliDocsBundle;

use Symfony\Component\Config\Definition\Configurator\DefinitionConfigurator;
use Symfony\Component\Config\Definition\Exception\InvalidConfigurationException;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

/**
 * The configuration (config/packages/ali_docs.yaml) and the routes (config/routes/ali_docs.yaml)
 * of the application are created with the command : php bin/console ali-docs:install
 */
class AliDocsBundle extends AbstractBundle
{
    public const CONFIG_KEY = 'ali_docs';

    /**
     * Roles refused for the edition : editing writes files on the server
     */
    private const FORBIDDEN_EDIT_ROLES = ['PUBLIC_ACCESS', 'IS_AUTHENTICATED_ANONYMOUSLY'];

    public function configure(DefinitionConfigurator $definition): void
    {
        $definition->rootNode()
            ->children()
                ->scalarNode('admin_path')
                    ->info('Url prefix of the edit pages.')
                    ->defaultValue('admin_documentation')
                ->end()
                ->arrayNode('layout')
                    ->info('The documentation pages have their own layout, independent of the application. These options connect them to the application.')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->scalarNode('home_url')
                            ->info('Url of the link back to the application, in the header (ex : "/"). Empty : no link.')
                            ->defaultNull()
                        ->end()
                        ->scalarNode('home_label')
                            ->info('Text of the link back to the application. Empty : "Home" (translated).')
                            ->defaultNull()
                        ->end()
                        ->scalarNode('favicon')
                            ->info('Favicon url or path (ex : "/favicon.ico").')
                            ->defaultNull()
                        ->end()
                        ->arrayNode('extra_css')
                            ->info('Stylesheets of the application added to the pages (ex : to change the colors).')
                            ->scalarPrototype()->end()
                            ->defaultValue([])
                        ->end()
                        ->arrayNode('extra_js')
                            ->info('Scripts of the application added to the pages (ex : statistics).')
                            ->scalarPrototype()->end()
                            ->defaultValue([])
                        ->end()
                    ->end()
                ->end()
                ->arrayNode('documentations')
                    ->info('One entry per documentation. The key is used in the urls, with "-" instead of "_" (ex : doc_public => /doc-public).')
                    ->defaultValue([])
                    ->arrayPrototype()
                        ->children()
                            ->scalarNode('doc_dir')
                                ->info('Folder of the documentation files (ex : "%kernel.project_dir%/doc_public").')
                                ->isRequired()
                                ->cannotBeEmpty()
                            ->end()
                            ->scalarNode('title')
                                ->info('Title displayed in the header.')
                                ->defaultValue('My Documentation')
                            ->end()
                            ->scalarNode('edit_security')
                                ->info('Role required to edit the pages. Required : editing writes files on the server.')
                                ->defaultValue('ROLE_ADMIN')
                                ->cannotBeEmpty()
                                ->validate()
                                    ->ifInArray(self::FORBIDDEN_EDIT_ROLES)
                                    ->thenInvalid('The edition can not be public (%s) : it writes files on the server. Use a role, ex : ROLE_ADMIN.')
                                ->end()
                            ->end()
                            ->scalarNode('view_security')
                                ->info('Role required to read the documentation (empty or PUBLIC_ACCESS : public)')
                                ->defaultValue('')
                            ->end()
                            ->arrayNode('switch_doc')
                                ->info('Keys of the other documentations displayed in the "Go to documentation" menu, or "*" for all the other documentations. Only the documentations the user can read are displayed.')
                                ->scalarPrototype()->end()
                                ->defaultValue([])
                            ->end()
                        ->end()
                    ->end()
                ->end()
            ->end()
        ;
    }

    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        $container->import('../config/services.yaml');

        $container->parameters()
            ->set('ali_docs.admin_path', $config['admin_path'])
            ->set('ali_docs.layout', $config['layout'])
            ->set('ali_docs.documentations', $this->resolveSwitchDocs($config['documentations']))
        ;
    }

    /**
     * switch_doc of each documentation : list of the other documentation keys
     * - "*" : all the other documentations (in the configuration order)
     * - the keys are checked (unknown key : configuration error) and the current documentation is removed
     *
     * @param array<string, array<string, mixed>> $documentations
     * @return array<string, array<string, mixed>>
     */
    private function resolveSwitchDocs(array $documentations): array
    {
        // Keys of the configuration : "-" are normalized to "_"
        $normalize = static fn (string $key): string => str_replace('-', '_', $key);
        $allKeys = array_map($normalize, array_keys($documentations));

        foreach ($documentations as $key => $documentation) {
            $key = $normalize($key);
            $switchDocs = array_map($normalize, $documentation['switch_doc'] ?? []);

            if (\in_array('*', $switchDocs, true)) {
                $switchDocs = $allKeys;
            }

            foreach ($switchDocs as $switchDoc) {
                if (!\in_array($switchDoc, $allKeys, true)) {
                    throw new InvalidConfigurationException(sprintf(
                        'Unknown documentation "%s" in "ali_docs.documentations.%s.switch_doc". Available: %s, "*".',
                        $switchDoc,
                        $key,
                        implode(', ', $allKeys)
                    ));
                }
            }

            $documentations[$key]['switch_doc'] = array_values(array_unique(array_diff($switchDocs, [$key])));
        }

        return $documentations;
    }

    /**
     * Retrieve the path of this bundle (ex : /path/SfApp/AliDocsBundle)
     */
    public function getBundlePath(): string
    {
        return $this->getPath();
    }
}
