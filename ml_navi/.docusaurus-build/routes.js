import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '3d7'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '5ef'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '35f'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'bed'),
            routes: [
              {
                path: '/docs/classical-ml/intro',
                component: ComponentCreator('/docs/classical-ml/intro', 'bf7'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/イントロダクション/ml_overview',
                component: ComponentCreator('/docs/classical-ml/イントロダクション/ml_overview', 'd37'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/イントロダクション/ml_roadmap',
                component: ComponentCreator('/docs/classical-ml/イントロダクション/ml_roadmap', '0ed'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/イントロダクション/ml_types',
                component: ComponentCreator('/docs/classical-ml/イントロダクション/ml_types', '519'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/データ準備・前処理/data_split',
                component: ComponentCreator('/docs/classical-ml/データ準備・前処理/data_split', 'cd9'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/データ準備・前処理/data_types',
                component: ComponentCreator('/docs/classical-ml/データ準備・前処理/data_types', '671'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/データ準備・前処理/eda',
                component: ComponentCreator('/docs/classical-ml/データ準備・前処理/eda', '0ab'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/データ準備・前処理/feature_engineering',
                component: ComponentCreator('/docs/classical-ml/データ準備・前処理/feature_engineering', '143'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/データ準備・前処理/imbalanced_data',
                component: ComponentCreator('/docs/classical-ml/データ準備・前処理/imbalanced_data', '265'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/データ準備・前処理/missing_values',
                component: ComponentCreator('/docs/classical-ml/データ準備・前処理/missing_values', 'ab4'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/モデル評価・選択/classification_metrics',
                component: ComponentCreator('/docs/classical-ml/モデル評価・選択/classification_metrics', 'be2'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/モデル評価・選択/cross_validation',
                component: ComponentCreator('/docs/classical-ml/モデル評価・選択/cross_validation', 'edf'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/モデル評価・選択/hyperparameter_tuning',
                component: ComponentCreator('/docs/classical-ml/モデル評価・選択/hyperparameter_tuning', 'b56'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/モデル評価・選択/model_selection',
                component: ComponentCreator('/docs/classical-ml/モデル評価・選択/model_selection', 'b16'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/モデル評価・選択/overfitting_generalization',
                component: ComponentCreator('/docs/classical-ml/モデル評価・選択/overfitting_generalization', 'bf9'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/モデル評価・選択/regression_metrics',
                component: ComponentCreator('/docs/classical-ml/モデル評価・選択/regression_metrics', '7e2'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/boosting',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/boosting', '373'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/decision_tree',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/decision_tree', 'd99'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/knn',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/knn', 'a8d'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/linear_regression',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/linear_regression', 'e7d'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/logistic_regression',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/logistic_regression', '297'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/naive_bayes',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/naive_bayes', 'b00'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/polynomial_regression',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/polynomial_regression', '99b'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/random_forest',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/random_forest', 'b81'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/regularized_regression',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/regularized_regression', '230'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/stacking',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/stacking', '662'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/svm',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/svm', '473'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師あり学習/xgboost_lightgbm',
                component: ComponentCreator('/docs/classical-ml/教師あり学習/xgboost_lightgbm', 'a89'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/anomaly_detection_stats',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/anomaly_detection_stats', 'a3f'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/autoencoder_anomaly',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/autoencoder_anomaly', '079'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/dbscan',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/dbscan', '25b'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/gmm',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/gmm', 'd32'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/hierarchical_clustering',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/hierarchical_clustering', '110'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/isolation_forest',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/isolation_forest', '4c3'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/kmeans',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/kmeans', 'c70'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/pca',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/pca', '7f1'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/tsne',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/tsne', '7dc'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/教師なし学習/umap',
                component: ComponentCreator('/docs/classical-ml/教師なし学習/umap', '477'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/数学的基礎/derivatives_gradients',
                component: ComponentCreator('/docs/classical-ml/数学的基礎/derivatives_gradients', 'b61'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/数学的基礎/information_theory',
                component: ComponentCreator('/docs/classical-ml/数学的基礎/information_theory', '597'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/数学的基礎/matrix_operations',
                component: ComponentCreator('/docs/classical-ml/数学的基礎/matrix_operations', 'ff2'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/数学的基礎/optimization_basics',
                component: ComponentCreator('/docs/classical-ml/数学的基礎/optimization_basics', 'acb'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/数学的基礎/probability_statistics',
                component: ComponentCreator('/docs/classical-ml/数学的基礎/probability_statistics', '890'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/classical-ml/数学的基礎/vectors_matrices',
                component: ComponentCreator('/docs/classical-ml/数学的基礎/vectors_matrices', '658'),
                exact: true,
                sidebar: "classicalMlSidebar"
              },
              {
                path: '/docs/deep-learning/intro',
                component: ComponentCreator('/docs/deep-learning/intro', 'ecf'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/activation_functions',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/activation_functions', '371'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/backpropagation',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/backpropagation', '4a7'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/initialization_vanishing',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/initialization_vanishing', '259'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/loss_functions',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/loss_functions', 'c94'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/mlp',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/mlp', '0ef'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/optimizers',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/optimizers', '94f'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/perceptron',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/perceptron', '67a'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/ニューラルネットワーク基礎/regularization',
                component: ComponentCreator('/docs/deep-learning/ニューラルネットワーク基礎/regularization', '417'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/cicd_ml',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/cicd_ml', '204'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/data_pipeline',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/data_pipeline', 'e7d'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/experiment_management',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/experiment_management', 'edb'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/federated_learning',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/federated_learning', '3ea'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/gnn',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/gnn', 'b1c'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/model_deployment',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/model_deployment', '744'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/model_monitoring',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/model_monitoring', '9f6'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/numpy',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/numpy', 'ff4'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/pandas',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/pandas', '250'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/pytorch_intro',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/pytorch_intro', '48d'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/pytorch_practice',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/pytorch_practice', 'e82'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/recommendation',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/recommendation', '032'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/sklearn',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/sklearn', 'c19'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/time_series',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/time_series', 'd18'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/visualization',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/visualization', '919'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/実践・ツール・MLOps/xai',
                component: ComponentCreator('/docs/deep-learning/実践・ツール・MLOps/xai', 'c20'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/強化学習/dqn',
                component: ComponentCreator('/docs/deep-learning/強化学習/dqn', 'f81'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/強化学習/dynamic_programming',
                component: ComponentCreator('/docs/deep-learning/強化学習/dynamic_programming', '742'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/強化学習/mdp',
                component: ComponentCreator('/docs/deep-learning/強化学習/mdp', 'f04'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/強化学習/monte_carlo_td',
                component: ComponentCreator('/docs/deep-learning/強化学習/monte_carlo_td', '558'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/強化学習/policy_gradient',
                component: ComponentCreator('/docs/deep-learning/強化学習/policy_gradient', 'b55'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/強化学習/q_learning_sarsa',
                component: ComponentCreator('/docs/deep-learning/強化学習/q_learning_sarsa', 'd05'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/強化学習/rl_basics',
                component: ComponentCreator('/docs/deep-learning/強化学習/rl_basics', '9e0'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/autoencoder',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/autoencoder', 'c40'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/cnn_architectures',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/cnn_architectures', 'a33'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/cnn_basics',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/cnn_basics', 'dce'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/diffusion',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/diffusion', 'ebf'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/gan',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/gan', 'a5c'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/lstm_gru',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/lstm_gru', '7fc'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/object_detection',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/object_detection', 'f8a'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/rnn',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/rnn', 'bb1'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/segmentation',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/segmentation', '481'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/seq2seq_attention',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/seq2seq_attention', 'bca'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/transfer_learning',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/transfer_learning', '89d'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/transformer',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/transformer', '9f6'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/深層学習アーキテクチャ/vae',
                component: ComponentCreator('/docs/deep-learning/深層学習アーキテクチャ/vae', '53d'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/自然言語処理/bert',
                component: ComponentCreator('/docs/deep-learning/自然言語処理/bert', '35e'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/自然言語処理/gpt_llm',
                component: ComponentCreator('/docs/deep-learning/自然言語処理/gpt_llm', 'b95'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/自然言語処理/prompt_engineering',
                component: ComponentCreator('/docs/deep-learning/自然言語処理/prompt_engineering', '037'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/自然言語処理/rag',
                component: ComponentCreator('/docs/deep-learning/自然言語処理/rag', '04b'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/自然言語処理/text_preprocessing',
                component: ComponentCreator('/docs/deep-learning/自然言語処理/text_preprocessing', '0a5'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/自然言語処理/text_representation',
                component: ComponentCreator('/docs/deep-learning/自然言語処理/text_representation', '20f'),
                exact: true,
                sidebar: "deepLearningSidebar"
              },
              {
                path: '/docs/deep-learning/自然言語処理/word_embeddings',
                component: ComponentCreator('/docs/deep-learning/自然言語処理/word_embeddings', '6bc'),
                exact: true,
                sidebar: "deepLearningSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
