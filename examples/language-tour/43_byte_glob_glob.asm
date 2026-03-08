; ZAX lowered .asm trace
; range: $0100..$206B (end exclusive)

; func byte_glob_glob begin
byte_glob_glob:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
push HL                        ; 010C: E5
ld de, glob_bytes              ; 010D: 11 00 00
ld hl, (glob_idx_word)         ; 0110: 2A 00 00
add HL, DE                     ; 0113: 19
ld A, (HL)                     ; 0114: 7E
pop HL                         ; 0115: E1
pop DE                         ; 0116: D1
push DE                        ; 0117: D5
push HL                        ; 0118: E5
ld de, glob_bytes              ; 0119: 11 00 00
ld hl, (glob_idx_word)         ; 011C: 2A 00 00
add HL, DE                     ; 011F: 19
ld (HL), A                     ; 0120: 77
pop HL                         ; 0121: E1
pop DE                         ; 0122: D1
ld H, $0000                    ; 0123: 26 00
ld L, A                        ; 0125: 6F
__zax_epilogue_0:
pop DE                         ; 0126: D1
pop BC                         ; 0127: C1
pop AF                         ; 0128: F1
ld SP, IX                      ; 0129: DD F9
pop IX                         ; 012B: DD E1
ret                            ; 012D: C9
; func byte_glob_glob end
; func main begin
main:
push IX                        ; 012E: DD E5
ld IX, $0000                   ; 0130: DD 21 00 00
add IX, SP                     ; 0134: DD 39
push AF                        ; 0136: F5
push BC                        ; 0137: C5
push DE                        ; 0138: D5
push HL                        ; 0139: E5
call byte_glob_glob            ; 013A: CD 00 00
__zax_epilogue_1:
pop HL                         ; 013D: E1
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func main end

; symbols:
; label byte_glob_glob = $0100
; label __zax_epilogue_0 = $0126
; label main = $012E
; label __zax_epilogue_1 = $013D
; data glob_bytes = $2000
; data glob_idx_word = $2008
; label __zax_startup = $200A
