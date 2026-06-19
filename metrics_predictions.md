# Jury Metrics and Predictions Report

This file is for VS Code only. It is not linked from the website, so users will not see it in the browser.

## Model Performance

These metrics come from the synthetic demo dataset used by the Flask backend.

| Model | Accuracy | Precision | Recall | F1 Score |
| --- | ---: | ---: | ---: | ---: |
| Logistic Regression | 0.6900 | 0.6943 | 0.6900 | 0.6899 |
| Random Forest | 0.9660 | 0.9668 | 0.9660 | 0.9660 |
| Ensemble | 0.9660 | 0.9670 | 0.9660 | 0.9659 |

## Example Prediction Flow

1. User enters age, sugar level, blood pressure, diet type, and ingredients.
2. Backend predicts health risk using Logistic Regression and Random Forest.
3. Backend combines the model outputs and assigns a risk label: low, moderate, or high.
4. Recipe recommendations are generated using TF-IDF and cosine similarity.
5. The final meal list is filtered to Indian recipes only.

## Example API Output

If the backend receives a high-risk health profile, it can return:
- Risk label: high
- Suggested meals: Indian recipes with lower sugar and lower sodium signals

## What to Tell the Jury

- The project uses machine learning for health risk prediction.
- Logistic Regression and Random Forest are trained on the health dataset.
- Precision, recall, F1, and accuracy are computed on a test split.
- Recipe recommendation uses TF-IDF and cosine similarity.
- The website shows the prediction results in the Home page cards, while this file is for a separate demo view in VS Code.
