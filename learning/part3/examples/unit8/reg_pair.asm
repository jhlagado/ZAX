; ZAX lowered .asm trace
; range: $0100..$8051 (end exclusive)

; func lo_byte_of begin
lo_byte_of:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ld (scratch), DE               ; 0112: ED 53 00 00
pop DE                         ; 0116: D1
ld A, (scratch)                ; 0117: 3A 00 00
ld L, A                        ; 011A: 6F
ld H, $0000                    ; 011B: 26 00
__zax_epilogue_0:
pop DE                         ; 011D: D1
pop BC                         ; 011E: C1
pop AF                         ; 011F: F1
ld SP, IX                      ; 0120: DD F9
pop IX                         ; 0122: DD E1
ret                            ; 0124: C9
; func lo_byte_of end
; func main begin
main:
push IX                        ; 0125: DD E5
ld IX, $0000                   ; 0127: DD 21 00 00
add IX, SP                     ; 012B: DD 39
push AF                        ; 012D: F5
push BC                        ; 012E: C5
push DE                        ; 012F: D5
ld HL, $0134                   ; 0130: 21 34 01
push HL                        ; 0133: E5
call lo_byte_of                ; 0134: CD 00 00
inc SP                         ; 0137: 33
inc SP                         ; 0138: 33
__zax_epilogue_1:
pop DE                         ; 0139: D1
pop BC                         ; 013A: C1
pop AF                         ; 013B: F1
ld SP, IX                      ; 013C: DD F9
pop IX                         ; 013E: DD E1
ret                            ; 0140: C9
; func main end

; symbols:
; label lo_byte_of = $0100
; label __zax_epilogue_0 = $011D
; label main = $0125
; label __zax_epilogue_1 = $0139
; data scratch = $8000
; label __zax_startup = $8002
