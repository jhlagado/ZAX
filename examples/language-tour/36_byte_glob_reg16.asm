; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_glob_reg16 begin
byte_glob_reg16:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
push DE                        ; 0113: D5
push HL                        ; 0114: E5
ld de, glob_bytes              ; 0115: 11 00 00
add HL, DE                     ; 0118: 19
ld A, (HL)                     ; 0119: 7E
pop HL                         ; 011A: E1
pop DE                         ; 011B: D1
push DE                        ; 011C: D5
push HL                        ; 011D: E5
ld de, glob_bytes              ; 011E: 11 00 00
add HL, DE                     ; 0121: 19
ld (HL), A                     ; 0122: 77
pop HL                         ; 0123: E1
pop DE                         ; 0124: D1
ld H, $0000                    ; 0125: 26 00
ld L, A                        ; 0127: 6F
__zax_epilogue_0:
pop DE                         ; 0128: D1
pop BC                         ; 0129: C1
pop AF                         ; 012A: F1
ld SP, IX                      ; 012B: DD F9
pop IX                         ; 012D: DD E1
ret                            ; 012F: C9
; func byte_glob_reg16 end
; func main begin
main:
push IX                        ; 0130: DD E5
ld IX, $0000                   ; 0132: DD 21 00 00
add IX, SP                     ; 0136: DD 39
push AF                        ; 0138: F5
push BC                        ; 0139: C5
push DE                        ; 013A: D5
push HL                        ; 013B: E5
ld HL, $0004                   ; 013C: 21 04 00
push HL                        ; 013F: E5
call byte_glob_reg16           ; 0140: CD 00 00
inc SP                         ; 0143: 33
inc SP                         ; 0144: 33
__zax_epilogue_1:
pop HL                         ; 0145: E1
pop DE                         ; 0146: D1
pop BC                         ; 0147: C1
pop AF                         ; 0148: F1
ld SP, IX                      ; 0149: DD F9
pop IX                         ; 014B: DD E1
ret                            ; 014D: C9
; func main end

; symbols:
; label byte_glob_reg16 = $0100
; label __zax_epilogue_0 = $0128
; label main = $0130
; label __zax_epilogue_1 = $0145
; data glob_bytes = $2000
