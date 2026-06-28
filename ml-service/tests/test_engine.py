"""
Unit tests for the triage inference engine, using a tiny hand-built model so the math
is checked independently of any trained artifact.
"""
import os
import sys
import math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from engine import TriageModel  # noqa: E402


def tiny_model() -> TriageModel:
    # 3 diseases, 3 symptoms; chosen so symptoms clearly discriminate
    classes = ["Cardiac", "Gastric", "Cold"]
    symptoms = ["chest_pain", "exertion", "runny_nose"]
    # P(symptom=1 | disease)
    p_present = np.array([
        [0.90, 0.85, 0.05],  # Cardiac
        [0.60, 0.05, 0.05],  # Gastric
        [0.05, 0.02, 0.90],  # Cold
    ])
    return TriageModel({
        "classes": classes,
        "symptoms": symptoms,
        "class_log_prior": np.log([1 / 3, 1 / 3, 1 / 3]).tolist(),
        "feature_log_prob": np.log(p_present).tolist(),
        "questions": {s: f"Do you have {s}?" for s in symptoms},
        "disease_meta": {
            "Cardiac": {"specialization": "Cardiology", "urgency": "urgent"},
            "Gastric": {"specialization": "Gastroenterology", "urgency": "medium"},
            "Cold": {"specialization": "General Medicine", "urgency": "low"},
        },
        "metrics": {},
    })


def test_posterior_is_normalized():
    m = tiny_model()
    post = m.posterior({"chest_pain": 1})
    assert math.isclose(post.sum(), 1.0, rel_tol=1e-9)
    assert len(post) == 3


def test_empty_evidence_returns_prior():
    m = tiny_model()
    post = m.posterior({})
    assert np.allclose(post, [1 / 3, 1 / 3, 1 / 3], atol=1e-9)


def test_unknown_symptom_is_ignored():
    m = tiny_model()
    assert np.allclose(m.posterior({"not_a_symptom": 1}), m.posterior({}))


def test_evidence_shifts_belief_correctly():
    m = tiny_model()
    # chest pain + worsens on exertion -> cardiac should dominate
    post = m.posterior({"chest_pain": 1, "exertion": 1})
    top = m.classes[int(np.argmax(post))]
    assert top == "Cardiac"
    # runny nose -> cold should dominate
    post2 = m.posterior({"runny_nose": 1})
    assert m.classes[int(np.argmax(post2))] == "Cold"


def test_info_gain_is_nonnegative():
    m = tiny_model()
    post = m.posterior({})
    for s in m.symptoms:
        assert m.info_gain(post, s) >= 0.0


def test_most_informative_question_selected():
    m = tiny_model()
    # from the prior, "exertion" best separates Cardiac from the rest -> highest info gain
    sym, gain = m.next_question({})
    assert sym in m.symptoms
    assert gain > 0.0


def test_step_recommends_and_escalates():
    m = tiny_model()
    step = m.step({"chest_pain": 1, "exertion": 1})
    assert step["posterior"][0]["disease"] == "Cardiac"
    assert step["urgency"] == "urgent"
    assert "Cardiology" in step["recommendedSpecializations"]


def test_step_done_flag_and_question_shape():
    m = tiny_model()
    step = m.step({})
    assert step["done"] is False
    assert step["nextQuestion"]["symptom"] in m.symptoms
    assert "infoGain" in step["nextQuestion"]
