from app.database import SessionLocal, engine
from app.models.loan_product import LoanProduct
from app.models import Base

def seed_database():
    """Seed the database with sample loan products."""
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Clear existing data to allow re-seeding with updated bank list and INR values
        db.query(LoanProduct).delete()
        db.commit()

        sample_products = [
            # Personal Loans
            LoanProduct(
                bank_name="SBI",
                loan_type="Personal",
                interest_rate=10.50,
                processing_fee_percent=1.00,
                min_credit_score=700,
                max_loan_amount=1500000.0,
                min_income_requirement=25000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            LoanProduct(
                bank_name="HDFC Bank",
                loan_type="Personal",
                interest_rate=11.25,
                processing_fee_percent=1.50,
                min_credit_score=720,
                max_loan_amount=2000000.0,
                min_income_requirement=30000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            LoanProduct(
                bank_name="ICICI Bank",
                loan_type="Personal",
                interest_rate=10.75,
                processing_fee_percent=1.25,
                min_credit_score=710,
                max_loan_amount=1800000.0,
                min_income_requirement=28000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            LoanProduct(
                bank_name="Axis Bank",
                loan_type="Personal",
                interest_rate=11.49,
                processing_fee_percent=1.50,
                min_credit_score=680,
                max_loan_amount=1500000.0,
                min_income_requirement=25000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            LoanProduct(
                bank_name="Yes Bank",
                loan_type="Personal",
                interest_rate=12.00,
                processing_fee_percent=2.00,
                min_credit_score=650,
                max_loan_amount=1000000.0,
                min_income_requirement=20000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            # Home Loans
            LoanProduct(
                bank_name="SBI",
                loan_type="Home",
                interest_rate=8.50,
                processing_fee_percent=0.35,
                min_credit_score=700,
                max_loan_amount=10000000.0,
                min_income_requirement=35000.0,
                tenure_options_months=[120, 180, 240, 360]
            ),
            LoanProduct(
                bank_name="HDFC Bank",
                loan_type="Home",
                interest_rate=8.75,
                processing_fee_percent=0.50,
                min_credit_score=700,
                max_loan_amount=8000000.0,
                min_income_requirement=40000.0,
                tenure_options_months=[120, 180, 240, 360]
            ),
            # Auto Loans
            LoanProduct(
                bank_name="ICICI Bank",
                loan_type="Auto",
                interest_rate=8.75,
                processing_fee_percent=1.00,
                min_credit_score=680,
                max_loan_amount=1500000.0,
                min_income_requirement=25000.0,
                tenure_options_months=[24, 36, 48, 60, 72]
            ),
            LoanProduct(
                bank_name="Axis Bank",
                loan_type="Auto",
                interest_rate=8.99,
                processing_fee_percent=1.00,
                min_credit_score=680,
                max_loan_amount=1200000.0,
                min_income_requirement=22000.0,
                tenure_options_months=[24, 36, 48, 60, 72]
            ),
            # Education Loans
            LoanProduct(
                bank_name="SBI",
                loan_type="Education",
                interest_rate=8.15,
                processing_fee_percent=0.00,
                min_credit_score=650,
                max_loan_amount=3000000.0,
                min_income_requirement=15000.0,
                tenure_options_months=[24, 36, 48, 60, 72, 84, 120]
            ),
            # Business Loans
            LoanProduct(
                bank_name="Yes Bank",
                loan_type="Business",
                interest_rate=14.50,
                processing_fee_percent=2.00,
                min_credit_score=680,
                max_loan_amount=5000000.0,
                min_income_requirement=50000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            # Kotak Mahindra Bank
            LoanProduct(
                bank_name="Kotak Mahindra Bank",
                loan_type="Personal",
                interest_rate=10.99,
                processing_fee_percent=1.25,
                min_credit_score=700,
                max_loan_amount=1500000.0,
                min_income_requirement=25000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            LoanProduct(
                bank_name="Kotak Mahindra Bank",
                loan_type="Home",
                interest_rate=8.85,
                processing_fee_percent=0.50,
                min_credit_score=700,
                max_loan_amount=7500000.0,
                min_income_requirement=38000.0,
                tenure_options_months=[120, 180, 240, 360]
            ),
            # Bank of Baroda
            LoanProduct(
                bank_name="Bank of Baroda",
                loan_type="Home",
                interest_rate=8.40,
                processing_fee_percent=0.25,
                min_credit_score=700,
                max_loan_amount=8000000.0,
                min_income_requirement=30000.0,
                tenure_options_months=[120, 180, 240, 360]
            ),
            LoanProduct(
                bank_name="Bank of Baroda",
                loan_type="Education",
                interest_rate=8.25,
                processing_fee_percent=0.00,
                min_credit_score=650,
                max_loan_amount=2500000.0,
                min_income_requirement=12000.0,
                tenure_options_months=[24, 36, 48, 60, 72, 84, 120]
            ),
            # IDFC First Bank
            LoanProduct(
                bank_name="IDFC First Bank",
                loan_type="Personal",
                interest_rate=11.49,
                processing_fee_percent=1.50,
                min_credit_score=680,
                max_loan_amount=1200000.0,
                min_income_requirement=22000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            LoanProduct(
                bank_name="IDFC First Bank",
                loan_type="Auto",
                interest_rate=9.25,
                processing_fee_percent=1.00,
                min_credit_score=650,
                max_loan_amount=1000000.0,
                min_income_requirement=20000.0,
                tenure_options_months=[24, 36, 48, 60, 72]
            ),
            # Punjab National Bank (PNB)
            LoanProduct(
                bank_name="PNB",
                loan_type="Personal",
                interest_rate=10.40,
                processing_fee_percent=1.00,
                min_credit_score=690,
                max_loan_amount=1000000.0,
                min_income_requirement=20000.0,
                tenure_options_months=[12, 24, 36, 48, 60]
            ),
            LoanProduct(
                bank_name="PNB",
                loan_type="Home",
                interest_rate=8.45,
                processing_fee_percent=0.35,
                min_credit_score=680,
                max_loan_amount=9000000.0,
                min_income_requirement=32000.0,
                tenure_options_months=[120, 180, 240, 360]
            )
        ]
        
        db.add_all(sample_products)
        db.commit()
        print(f"Successfully seeded database with {len(sample_products)} loan products.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
